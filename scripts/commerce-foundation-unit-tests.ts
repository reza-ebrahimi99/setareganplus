/**
 * Commerce Foundation unit tests (no DB).
 * Run: npm run test:commerce-foundation
 */

import assert from "node:assert/strict";
import {
  assertSameOrganization,
  assertUniqueCategorySlug,
  assertValidCategoryParent,
  buildCommerceOrderNumber,
  buildOrderLineSnapshot,
  calculateOrderTotals,
  CommerceCategoryValidationError,
  CommerceItemValidationError,
  CommerceOrderValidationError,
  COMMERCE_CATEGORY_SEED,
  defaultFulfillmentHints,
  planCategorySeedInserts,
  validateCreateCommerceItem,
} from "../lib/commerce";
import {
  commerceOrderPayableTarget,
  isCommerceOrderPayable,
  isRegistrationPayable,
  PayableTargetError,
  registrationPayableTarget,
  validatePayableTarget,
} from "../lib/payment/payable";
import { PERMISSIONS, permissionsForRole } from "../lib/auth/permissions";
import { SystemRole } from "../generated/prisma/enums";

let failures = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`  FAIL ${name}`);
    console.error(error);
  }
}

console.log("Commerce Foundation unit tests\n");

check("payable: registration target valid", () => {
  const target = registrationPayableTarget("reg_1");
  assert.equal(target.payableType, "REGISTRATION");
  assert.equal(target.payableId, "reg_1");
  assert.equal(target.registrationId, "reg_1");
  assert.equal(isRegistrationPayable(target), true);
});

check("payable: commerce order target valid", () => {
  const target = commerceOrderPayableTarget("ord_1");
  assert.equal(target.payableType, "COMMERCE_ORDER");
  assert.equal(target.payableId, "ord_1");
  assert.equal(target.registrationId, null);
  assert.equal(isCommerceOrderPayable(target), true);
});

check("payable: registration requires matching ids", () => {
  assert.throws(
    () =>
      validatePayableTarget({
        payableType: "REGISTRATION",
        payableId: "a",
        registrationId: "b",
      }),
    PayableTargetError,
  );
});

check("payable: non-registration forbids registrationId", () => {
  assert.throws(
    () =>
      validatePayableTarget({
        payableType: "COMMERCE_ORDER",
        payableId: "ord_1",
        registrationId: "reg_1",
      }),
    PayableTargetError,
  );
});

check("payable: reserved future types blocked for create", () => {
  assert.throws(
    () =>
      validatePayableTarget({
        payableType: "BOOKING",
        payableId: "book_1",
        registrationId: null,
      }),
    PayableTargetError,
  );
});

check("payable: existing registration compatibility shape", () => {
  // Mimic backfilled intent fields used by startCheckoutForRegistration.
  const target = validatePayableTarget({
    payableType: "REGISTRATION",
    payableId: "legacy-reg",
    registrationId: "legacy-reg",
  });
  assert.equal(target.registrationId, "legacy-reg");
});

check("category: parent cannot be self", () => {
  assert.throws(
    () =>
      assertValidCategoryParent({
        categoryId: "c1",
        parentId: "c1",
        existing: [{ id: "c1", parentId: null, slug: "a" }],
      }),
    CommerceCategoryValidationError,
  );
});

check("category: circular nesting prevented", () => {
  const existing = [
    { id: "root", parentId: null, slug: "root" },
    { id: "child", parentId: "root", slug: "child" },
    { id: "leaf", parentId: "child", slug: "leaf" },
  ];
  assert.throws(
    () =>
      assertValidCategoryParent({
        categoryId: "root",
        parentId: "leaf",
        existing,
      }),
    CommerceCategoryValidationError,
  );
});

check("category: duplicate slug prevented", () => {
  assert.throws(
    () =>
      assertUniqueCategorySlug({
        slug: "books",
        existing: [{ id: "1", parentId: null, slug: "books" }],
      }),
    CommerceCategoryValidationError,
  );
});

check("category: seed plan idempotent", () => {
  const first = planCategorySeedInserts({
    organizationId: "org",
    existingSeedKeys: new Set(),
    definitions: COMMERCE_CATEGORY_SEED,
  });
  assert.equal(first.length, COMMERCE_CATEGORY_SEED.length);

  const second = planCategorySeedInserts({
    organizationId: "org",
    existingSeedKeys: new Set(COMMERCE_CATEGORY_SEED.map((d) => d.seedKey)),
    definitions: COMMERCE_CATEGORY_SEED,
  });
  assert.equal(second.length, 0);
});

check("category: seed nested parents present", () => {
  const planned = planCategorySeedInserts({
    organizationId: "org",
    existingSeedKeys: new Set(),
    definitions: COMMERCE_CATEGORY_SEED,
  });
  const courses = planned.find((row) => row.seedKey === "courses");
  const child = planned.find((row) => row.seedKey === "courses-online");
  assert.ok(courses);
  assert.equal(child?.parentSeedKey, "courses");
});

check("catalog: create item validation", () => {
  const item = validateCreateCommerceItem({
    organizationId: "org",
    title: "جزوه ریاضی",
    slug: "jozveh-riyazi",
    systemKind: "DIGITAL",
    basePriceRials: 100_000,
    salePriceRials: 80_000,
    categoryIds: ["cat1", "cat1", "cat2"],
  });
  assert.equal(item.grantsDigitalAccess, true);
  assert.equal(item.requiresShipping, false);
  assert.deepEqual(item.categoryIds, ["cat1", "cat2"]);
});

check("catalog: reject invalid prices", () => {
  assert.throws(
    () =>
      validateCreateCommerceItem({
        organizationId: "org",
        title: "x",
        slug: "x",
        systemKind: "PHYSICAL",
        basePriceRials: 10,
        salePriceRials: 20,
      }),
    CommerceItemValidationError,
  );
});

check("catalog: fulfillment defaults by kind", () => {
  assert.equal(defaultFulfillmentHints("CONSULTING").requiresScheduling, true);
  assert.equal(defaultFulfillmentHints("COURSE").requiresEnrollment, true);
  assert.equal(defaultFulfillmentHints("PHYSICAL").requiresShipping, false);
});

check("order: line snapshot + totals", () => {
  const line = buildOrderLineSnapshot({
    itemId: "item1",
    titleSnapshot: "کتاب فیزیک",
    skuSnapshot: "SKU-1",
    systemKindSnapshot: "PHYSICAL",
    unitPriceRials: 50_000,
    quantity: 2,
    discountRials: 10_000,
  });
  assert.equal(line.totalRials, 90_000);

  const totals = calculateOrderTotals({
    lines: [
      {
        itemId: "item1",
        titleSnapshot: "کتاب فیزیک",
        systemKindSnapshot: "PHYSICAL",
        unitPriceRials: 50_000,
        quantity: 2,
        discountRials: 10_000,
      },
      {
        itemId: "item2",
        titleSnapshot: "مشاوره",
        systemKindSnapshot: "CONSULTING",
        unitPriceRials: 200_000,
        quantity: 1,
      },
    ],
    orderDiscountRials: 5_000,
    shippingRials: 20_000,
    taxRials: 0,
  });
  assert.equal(totals.subtotalRials, 290_000);
  assert.equal(totals.grandTotalRials, 305_000);
  assert.equal(totals.lines.length, 2);
});

check("order: tenant isolation helper", () => {
  assert.throws(
    () => assertSameOrganization("org-a", "org-b", "order"),
    CommerceOrderValidationError,
  );
  assertSameOrganization("org-a", "org-a");
});

check("order: order number format", () => {
  const number = buildCommerceOrderNumber({
    now: new Date("2026-07-29T12:00:00Z"),
    sequence: 42,
  });
  assert.equal(number, "ORD-20260729-00042");
});

check("rbac: commerce permissions registered", () => {
  for (const key of [
    "commerce.view",
    "commerce.manage",
    "commerce.categories.manage",
    "commerce.products.manage",
    "commerce.orders.view",
    "commerce.orders.manage",
    "commerce.payments.view",
    "commerce.reports.view",
  ] as const) {
    assert.ok((PERMISSIONS as readonly string[]).includes(key), key);
  }
  const owner = permissionsForRole(SystemRole.ORGANIZATION_OWNER);
  assert.ok(owner.has("commerce.view"));
  const finance = permissionsForRole(SystemRole.FINANCE);
  assert.ok(finance.has("commerce.payments.view"));
  assert.equal(finance.has("commerce.products.manage"), false);
});

check("nav: commerce children filter by specific permission", () => {
  const {
    filterAdminNavChildren,
    resolveEnabledAdminNavItem,
  } = require("../lib/admin/nav-permissions") as typeof import("../lib/admin/nav-permissions");
  const { adminNavGroups } = require("../content/admin") as typeof import("../content/admin");

  const commerce = adminNavGroups
    .flatMap((g) => g.items)
    .find((item) => item.enabled && item.href === "/admin/commerce");
  assert.ok(commerce && commerce.enabled);

  const financePerms = [
    "commerce.view",
    "commerce.orders.view",
    "commerce.payments.view",
    "commerce.reports.view",
  ];
  const financeChildren = filterAdminNavChildren(commerce.children, financePerms);
  assert.deepEqual(
    financeChildren.map((c) => c.href),
    ["/admin/commerce", "/admin/commerce/orders", "/admin/commerce/payments"],
  );
  assert.equal(
    financeChildren.some((c) => c.href === "/admin/commerce/products"),
    false,
  );

  const productsOnly = resolveEnabledAdminNavItem(commerce, [
    "commerce.products.manage",
  ]);
  assert.equal(productsOnly.visible, true);
  assert.equal(productsOnly.href, "/admin/commerce/products");
  assert.deepEqual(
    productsOnly.children.map((c) => c.href),
    ["/admin/commerce/products"],
  );

  const none = resolveEnabledAdminNavItem(commerce, ["crm.view_assigned"]);
  assert.equal(none.visible, false);
});

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
}

console.log("\nAll commerce foundation tests passed.");
