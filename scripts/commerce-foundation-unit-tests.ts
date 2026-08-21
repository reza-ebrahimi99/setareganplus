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

check("order: ops stage machine", () => {
  const {
    nextCommerceOpsStage,
    previousCommerceOpsStage,
    canAdvanceCommerceOpsStage,
    canRollbackCommerceOpsStage,
    commerceOpsNextActionLabel,
    syncedLifecycleForOpsStage,
    COMMERCE_OPS_STAGE_LABELS,
  } = require("../lib/commerce/orders/ops-stage") as typeof import("../lib/commerce/orders/ops-stage");

  assert.equal(nextCommerceOpsStage("PAID"), "IN_PRODUCTION");
  assert.equal(nextCommerceOpsStage("DELIVERED_TO_STUDENT"), null);
  assert.equal(previousCommerceOpsStage("READY_FOR_PICKUP"), "IN_PRODUCTION");
  assert.equal(commerceOpsNextActionLabel("IN_PRODUCTION"), "ثبت آماده تحویل");
  assert.equal(COMMERCE_OPS_STAGE_LABELS.READY_FOR_PICKUP, "آماده تحویل");

  const blocked = canAdvanceCommerceOpsStage({
    current: "REGISTERED",
    paymentPaid: false,
  });
  assert.equal(blocked.ok, false);

  const advance = canAdvanceCommerceOpsStage({
    current: "PAID",
    paymentPaid: true,
  });
  assert.equal(advance.ok, true);
  if (advance.ok) assert.equal(advance.next, "IN_PRODUCTION");

  const rollback = canRollbackCommerceOpsStage({
    current: "IN_PRODUCTION",
    paymentPaid: true,
  });
  assert.equal(rollback.ok, true);
  if (rollback.ok) assert.equal(rollback.previous, "PAID");

  const blockedPaidRollback = canRollbackCommerceOpsStage({
    current: "PAID",
    paymentPaid: true,
  });
  assert.equal(blockedPaidRollback.ok, false);

  const blockedFirst = canRollbackCommerceOpsStage({
    current: "REGISTERED",
    paymentPaid: false,
  });
  assert.equal(blockedFirst.ok, false);

  const paidLife = syncedLifecycleForOpsStage("PAID", true);
  assert.equal(paidLife.status, "PAID");
  const readyLife = syncedLifecycleForOpsStage("READY_FOR_PICKUP", true);
  assert.equal(readyLife.fulfillmentStatus, "AWAITING_PICKUP");
  const deliveredLife = syncedLifecycleForOpsStage("DELIVERED_TO_STUDENT", true);
  assert.equal(deliveredLife.status, "COMPLETED");
  assert.equal(deliveredLife.fulfillmentStatus, "DELIVERED");
});

check("order: kpi formatter uses supplied counts", () => {
  const { formatOrderOpsKpis } = require("../lib/commerce/orders/kpis") as typeof import("../lib/commerce/orders/kpis");
  const cards = formatOrderOpsKpis({
    todayOrders: 4,
    waitingPayment: 2,
    inProduction: 3,
    ready: 1,
    deliveredToday: 5,
    todayRevenueRials: 1000,
    girls: 6,
    boys: 7,
    elementary: 8,
    delayed: 9,
    avgProcessingMinutes: 40,
    avgDeliveryMinutes: 17,
  });
  assert.equal(cards.find((c) => c.key === "today")?.value, 4);
  assert.equal(cards.find((c) => c.key === "waitingPayment")?.value, 2);
  assert.equal(cards.find((c) => c.key === "girls")?.value, 6);
  assert.equal(cards.find((c) => c.key === "boys")?.value, 7);
  assert.equal(cards.find((c) => c.key === "elementary")?.value, 8);
  assert.equal(cards.find((c) => c.key === "todayRevenue")?.value, 1000);
  assert.equal(cards.find((c) => c.key === "delayed")?.value, 9);
  assert.equal(cards.find((c) => c.key === "avgProcessing")?.value, 40);
});
check("order: ops intelligence priority delay and health", () => {
  const {
    buildCommerceOpsIntelligence,
  } = require("../lib/commerce/orders/intelligence") as typeof import("../lib/commerce/orders/intelligence");
  const urgent = buildCommerceOpsIntelligence({
    opsStage: "IN_PRODUCTION",
    paymentPaid: true,
    urgentDelivery: true,
    opsVip: false,
  });
  assert.equal(urgent.priority, "URGENT");
  const overdue = buildCommerceOpsIntelligence({
    opsStage: "IN_PRODUCTION",
    paymentPaid: true,
    urgentDelivery: false,
    opsVip: false,
    inProductionAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  });
  assert.equal(overdue.priority, "OVERDUE");
  assert.equal(overdue.delayKind, "production");
  assert.equal(overdue.healthLevel, "warning");
  const readyDelay = buildCommerceOpsIntelligence({
    opsStage: "READY_FOR_PICKUP",
    paymentPaid: true,
    urgentDelivery: false,
    opsVip: true,
    readyForPickupAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
  });
  assert.equal(readyDelay.delayKind, "ready");
  const healthy = buildCommerceOpsIntelligence({
    opsStage: "DELIVERED_TO_STUDENT",
    paymentPaid: true,
    urgentDelivery: false,
    opsVip: false,
  });
  assert.equal(healthy.healthScore, 100);
  const unpaid = buildCommerceOpsIntelligence({
    opsStage: "REGISTERED",
    paymentPaid: false,
    urgentDelivery: false,
    opsVip: false,
    rollbackCount: 2,
  });
  assert.ok(unpaid.healthScore < 80);
});
check("order: empty allowed branches match nothing", () => {
  const { buildAdminCommerceOrderWhere } = require("../lib/commerce/orders/service") as typeof import("../lib/commerce/orders/service");
  const { commerceAllowedBranchScope } = require("../lib/commerce/orders/filters") as typeof import("../lib/commerce/orders/filters");
  const where = buildAdminCommerceOrderWhere({
    organizationId: "org",
    allowedBranchIds: [],
  });
  assert.ok(Array.isArray(where.AND));
  const scope = commerceAllowedBranchScope([]);
  assert.deepEqual(scope, {
    OR: [{ branchId: { in: [] } }, { pickupBranchId: { in: [] } }],
  });
  assert.deepEqual(commerceAllowedBranchScope(null), {});
});

check("order: major hidden for grades 1-9", () => {
  const { commerceGradeRequiresMajor, resolveCommerceStudentMajor } = require("../lib/commerce/student-fields") as typeof import("../lib/commerce/student-fields");
  assert.equal(commerceGradeRequiresMajor("GRADE_9"), false);
  assert.equal(commerceGradeRequiresMajor("GRADE_10"), true);
  assert.deepEqual(resolveCommerceStudentMajor({ grade: "GRADE_8", major: "MATH" }), {
    ok: true,
    major: null,
  });
  const missing = resolveCommerceStudentMajor({ grade: "GRADE_11", major: null });
  assert.equal(missing.ok, false);
});

check("order: handover required before delivery", () => {
  const { canAdvanceCommerceOpsStage, canRollbackCommerceOpsStage } = require("../lib/commerce/orders/ops-stage") as typeof import("../lib/commerce/orders/ops-stage");
  const blocked = canAdvanceCommerceOpsStage({
    current: "READY_FOR_PICKUP",
    paymentPaid: true,
    handoverStaffUserId: null,
  });
  assert.equal(blocked.ok, false);
  const ok = canAdvanceCommerceOpsStage({
    current: "READY_FOR_PICKUP",
    paymentPaid: true,
    handoverStaffUserId: "staff_1",
  });
  assert.equal(ok.ok, true);
  const unpaidDeliver = canAdvanceCommerceOpsStage({
    current: "READY_FOR_PICKUP",
    paymentPaid: false,
    handoverStaffUserId: "staff_1",
  });
  assert.equal(unpaidDeliver.ok, false);
  const deliveredRollback = canRollbackCommerceOpsStage({
    current: "DELIVERED_TO_STUDENT",
    paymentPaid: true,
    allowDeliveredRollback: false,
  });
  assert.equal(deliveredRollback.ok, false);
  const allowedRollback = canRollbackCommerceOpsStage({
    current: "DELIVERED_TO_STUDENT",
    paymentPaid: true,
    allowDeliveredRollback: true,
  });
  assert.equal(allowedRollback.ok, true);
});

check("rbac: commerce permissions registered", () => {
  for (const key of [
    "commerce.view",
    "commerce.manage",
    "commerce.categories.manage",
    "commerce.products.manage",
    "commerce.orders.view",
    "commerce.orders.manage",
    "commerce.orders.rollback",
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
  assert.equal(finance.has("commerce.orders.rollback"), false);
  const branchManager = permissionsForRole(SystemRole.BRANCH_MANAGER);
  assert.ok(branchManager.has("commerce.orders.rollback"));
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
    ["/admin/commerce", "/admin/commerce/orders", "/admin/commerce/production", "/admin/commerce/performance", "/admin/commerce/pickup", "/admin/commerce/payments"],
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

check("order: parse qr input extracts token only", () => {
  const { parseCommerceOrderQrInput } = require("../lib/commerce/orders/qr") as typeof import("../lib/commerce/orders/qr");
  assert.equal(
    parseCommerceOrderQrInput("https://setareganplus.ir/booklet/abc123token"),
    "abc123token",
  );
  assert.equal(
    parseCommerceOrderQrInput("https://setareganplus.ir/admin/commerce/pickup/abc123token"),
    "abc123token",
  );
  assert.equal(parseCommerceOrderQrInput("/booklet/tok_99"), "tok_99");
  assert.equal(parseCommerceOrderQrInput("/admin/commerce/pickup/tok_99"), "tok_99");
  assert.equal(parseCommerceOrderQrInput("cuidtoken12"), "cuidtoken12");
  assert.equal(parseCommerceOrderQrInput(""), null);
});

check("order: qr encodes production pickup url with camera-safe render", () => {
  const qr = require("../lib/commerce/orders/qr") as typeof import("../lib/commerce/orders/qr");
  assert.equal(
    qr.commerceOrderQrUrl("abc123token"),
    "https://setareganplus.ir/booklet/abc123token",
  );
  assert.equal(qr.commerceOrderReceiptUrl("abc123token"), qr.commerceOrderQrUrl("abc123token"));
  assert.equal(qr.COMMERCE_QR_ERROR_CORRECTION, "Q");
  assert.equal(qr.COMMERCE_QR_MARGIN, 4);
  assert.equal(qr.COMMERCE_QR_DARK, "#000000");
  assert.equal(qr.COMMERCE_QR_LIGHT, "#ffffff");
  assert.ok(qr.COMMERCE_QR_MIN_SIZE >= 256);
});

check("order: booklet ready eta copy", () => {
  const { bookletReadyEtaCopy } = require("../lib/commerce/orders/receipt") as typeof import("../lib/commerce/orders/receipt");
  assert.equal(bookletReadyEtaCopy("PAID").ready, false);
  assert.equal(bookletReadyEtaCopy("PAID").text, "۱ تا ۲ روز کاری");
  assert.equal(bookletReadyEtaCopy("READY_FOR_PICKUP").ready, true);
  assert.equal(bookletReadyEtaCopy("DELIVERED_TO_STUDENT").text, "جزوه شما آماده تحویل است.");
});

check("order: booklet paid sms is a receipt not a registration template", () => {
  const {
    buildBookletPaidSmsBody,
    buildBookletStageSmsBody,
  } = require("../lib/commerce/commerce-sms") as typeof import("../lib/commerce/commerce-sms");
  const ctx = {
    fullName: "علی رضایی",
    booklet: "جزوه ریاضی",
    amount: "۱۲۰٬۰۰۰ ریال",
    orderNumber: "ORD-1",
    pickupBranch: "شعبه پسران",
    statusLabel: "پرداخت",
    receiptUrl: "https://setareganplus.ir/booklet/tok",
    pickupUrl: "https://setareganplus.ir/booklet/tok",
    hours: "هر روز ۱۲:۰۰ تا ۲۰:۳۰",
  };
  const paid = buildBookletPaidSmsBody(ctx);
  assert.equal(paid.includes("جزوه ریاضی"), true);
  assert.equal(paid.includes("ORD-1"), true);
  assert.equal(paid.includes("شعبه پسران"), true);
  assert.equal(paid.includes("/booklet/tok"), true);
  const ready = buildBookletStageSmsBody("READY_FOR_PICKUP", ctx);
  assert.equal(ready.includes("جزوه شما آماده تحویل است."), true);
  assert.equal(ready.includes("هر روز ۱۲:۰۰ تا ۲۰:۳۰"), true);
});

check("order: pickup branch scope helper", () => {
  const { isCommercePickupBranchAllowed } = require("../lib/commerce/orders/pickup-scope") as typeof import("../lib/commerce/orders/pickup-scope");
  assert.equal(
    isCommercePickupBranchAllowed({
      pickupBranchId: "a",
      catalogBranchId: "b",
      allowedBranchIds: null,
    }),
    true,
  );
  assert.equal(
    isCommercePickupBranchAllowed({
      pickupBranchId: "a",
      catalogBranchId: "b",
      allowedBranchIds: ["a"],
    }),
    true,
  );
  assert.equal(
    isCommercePickupBranchAllowed({
      pickupBranchId: "a",
      catalogBranchId: "b",
      allowedBranchIds: ["z"],
    }),
    false,
  );
});

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
}

void (async () => {
  const qr = require("../lib/commerce/orders/qr") as typeof import("../lib/commerce/orders/qr");
  const sharp = require("sharp") as typeof import("sharp");
  const jsQR = require("jsqr") as (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;
  const token = "tok_scan_fixture";
  const expected = qr.commerceOrderQrUrl(token);
  const png = await qr.generateCommerceOrderQrPng(token, qr.COMMERCE_QR_PREVIEW_SIZE);
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  try {
    assert.equal(decoded?.data, expected);
    console.log("  ok  order: generated qr decodes to production pickup url");
  } catch (error) {
    console.error("  FAIL order: generated qr decodes to production pickup url");
    console.error(error);
    process.exit(1);
  }
  console.log("\nAll commerce foundation tests passed.");
})().catch((error) => {
  console.error("  FAIL order: generated qr decodes to production pickup url");
  console.error(error);
  process.exit(1);
});
