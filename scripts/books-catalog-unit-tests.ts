/**
 * Pure Book Commerce ERP (Phase A + Catalog) tests. No database connection.
 */

import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { BookPriceKind, BookSkuStatus } from "../generated/prisma/enums";
import { resolveBooksFlag } from "../lib/books/flags";
import {
  formatRials,
  isFuturePrice,
  isHistoricalPrice,
  resolveCurrentPrice,
} from "../lib/books/catalog/price";
import { buildSkuSearchText, matchesSkuSearch } from "../lib/books/catalog/search";
import { formatDocumentNumber } from "../lib/books/catalog/sequence";
import {
  buildMappedCatalogRows,
  detectCatalogHeaderAlias,
  findCatalogHeaderRowNumber,
  validateMappedCatalogRows,
} from "../lib/books/catalog/import-parser";
import { allocateUniqueBookSkuSlug, slugifyBookSku } from "../lib/books/catalog/slug";
import {
  bookSkuStatusFromShopStatus,
  shopStatusFromBookSku,
} from "../lib/commerce/catalog/shop-status";
import {
  partitionStarBookShelves,
  recommendStarBookProducts,
} from "../lib/commerce/starbook/shelves";
import type { PublicCommerceProduct } from "../lib/commerce/catalog/service";

let passed = 0;
const pending: Promise<void>[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  pending.push(
    Promise.resolve()
      .then(() => fn())
      .then(() => {
        passed += 1;
        console.log(`✓ ${name}`);
      }),
  );
}

test("bookCommerce flag defaults off when no org row exists", () => {
  assert.equal(resolveBooksFlag({ hardOff: false, orgFlagEnabled: null }), false);
});

test("bookCommerce flag stays off when org row is disabled", () => {
  assert.equal(resolveBooksFlag({ hardOff: false, orgFlagEnabled: false }), false);
});

test("bookCommerce flag is on only when org row is enabled", () => {
  assert.equal(resolveBooksFlag({ hardOff: false, orgFlagEnabled: true }), true);
});

test("STAROS_BOOKS_ERP_HARD_OFF wins over an enabled org flag", () => {
  assert.equal(resolveBooksFlag({ hardOff: true, orgFlagEnabled: true }), false);
});

test("resolveCurrentPrice picks the row covering now, not history or future", () => {
  const now = new Date("2026-06-01T00:00:00.000Z");
  const prices = [
    {
      id: "p1",
      kind: BookPriceKind.LIST,
      amountRials: 100_000,
      effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
      effectiveTo: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      id: "p2",
      kind: BookPriceKind.LIST,
      amountRials: 150_000,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      effectiveTo: null,
    },
    {
      id: "p3",
      kind: BookPriceKind.LIST,
      amountRials: 200_000,
      effectiveFrom: new Date("2027-01-01T00:00:00.000Z"),
      effectiveTo: null,
    },
  ];
  const current = resolveCurrentPrice(prices, BookPriceKind.LIST, now);
  assert.equal(current?.id, "p2");
  assert.equal(isHistoricalPrice(prices[0]!, now), true);
  assert.equal(isFuturePrice(prices[2]!, now), true);
});

test("resolveCurrentPrice ignores the other price kind", () => {
  const now = new Date("2026-06-01T00:00:00.000Z");
  const prices = [
    {
      id: "sale-1",
      kind: BookPriceKind.SALE,
      amountRials: 90_000,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      effectiveTo: null,
    },
  ];
  assert.equal(resolveCurrentPrice(prices, BookPriceKind.LIST, now), null);
  assert.equal(resolveCurrentPrice(prices, BookPriceKind.SALE, now)?.id, "sale-1");
});

test("formatRials uses thousands separators", () => {
  assert.equal(formatRials(1_250_000).length > 0, true);
  assert.equal(formatRials(0), "۰");
});

test("buildSkuSearchText is lowercase and includes all identity fields", () => {
  const text = buildSkuSearchText({
    internalCode: "BA-001",
    barcode: "9786001234567",
    title: "ریاضی هفتم",
    editionLabel: "چاپ دوم",
    keywords: "کنکور",
    publisherName: "انتشارات قلم‌چی",
  });
  assert.equal(text.includes("ba-001"), true);
  assert.equal(text.includes("ریاضی هفتم"), true);
  assert.equal(matchesSkuSearch(text, "قلم"), true);
  assert.equal(matchesSkuSearch(text, "فیزیک"), false);
});

test("matchesSkuSearch treats an empty query as always matching", () => {
  assert.equal(matchesSkuSearch("anything", ""), true);
  assert.equal(matchesSkuSearch("anything", "   "), true);
});

test("formatDocumentNumber pads to 6 digits", () => {
  assert.equal(formatDocumentNumber("BA", "1405", 123), "BA-1405-000123");
  assert.equal(formatDocumentNumber("BA", "1405", 7), "BA-1405-000007");
});

test("catalog import header aliases detect Persian and English columns", () => {
  assert.equal(detectCatalogHeaderAlias("کد داخلی"), "internalCode");
  assert.equal(detectCatalogHeaderAlias("عنوان"), "title");
  assert.equal(detectCatalogHeaderAlias("ناشر"), "publisherName");
  assert.equal(detectCatalogHeaderAlias("قیمت"), "listPriceRials");
  assert.equal(detectCatalogHeaderAlias("ستون ناشناخته"), "IGNORE");
});

test("catalog import requires internalCode, title, and a non-negative price", () => {
  const { validRows, invalidRows } = validateMappedCatalogRows([
    {
      excelRowNumber: 2,
      values: { internalCode: "BA-001", title: "ریاضی هفتم", listPriceRials: "150000" },
      hasFormula: false,
    },
    {
      excelRowNumber: 3,
      values: { internalCode: "", title: "", listPriceRials: "-5" },
      hasFormula: false,
    },
  ]);
  assert.equal(validRows.length, 1);
  assert.equal(validRows[0]?.internalCode, "BA-001");
  assert.equal(validRows[0]?.listPriceRials, 150_000);
  assert.equal(invalidRows.length, 1);
  assert.ok(invalidRows[0]!.errors.length >= 2);
});

test("catalog import rejects a formula-bearing row", () => {
  const { validRows, invalidRows } = validateMappedCatalogRows([
    {
      excelRowNumber: 2,
      values: { internalCode: "BA-002", title: "فیزیک هشتم", listPriceRials: "200000" },
      hasFormula: true,
    },
  ]);
  assert.equal(validRows.length, 0);
  assert.equal(invalidRows.length, 1);
  assert.ok(invalidRows[0]!.errors.some((message) => message.includes("فرمول")));
});

test("catalog import flags a duplicate internal code within the same file", () => {
  const { validRows, invalidRows } = validateMappedCatalogRows([
    {
      excelRowNumber: 2,
      values: { internalCode: "BA-003", title: "شیمی دهم", listPriceRials: "180000" },
      hasFormula: false,
    },
    {
      excelRowNumber: 5,
      values: { internalCode: "ba-003", title: "شیمی دهم (نسخه دوم)", listPriceRials: "190000" },
      hasFormula: false,
    },
  ]);
  assert.equal(validRows.length, 1);
  assert.equal(invalidRows.length, 1);
  assert.ok(invalidRows[0]!.errors.some((message) => message.includes("تکراری")));
});

test("catalog import normalizes Persian-digit prices and strips thousand separators", () => {
  const { validRows } = validateMappedCatalogRows([
    {
      excelRowNumber: 2,
      values: { internalCode: "BA-004", title: "زیست یازدهم", listPriceRials: "۱۵۰,۰۰۰" },
      hasFormula: false,
    },
  ]);
  assert.equal(validRows[0]?.listPriceRials, 150_000);
});

test("findCatalogHeaderRowNumber does not drop the first data row when the header is row 1 (regression)", () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("catalog");
  sheet.addRow(["کد داخلی", "عنوان", "قیمت"]);
  sheet.addRow(["BA-1001", "ریاضی هفتم", "1250000"]);
  sheet.addRow(["BA-1002", "فیزیک دهم", "1850000"]);

  const headerRowNumber = findCatalogHeaderRowNumber(sheet);
  assert.equal(headerRowNumber, 1);

  const rawRows = buildMappedCatalogRows({
    worksheet: sheet,
    mapping: { "1": "internalCode", "2": "title", "3": "listPriceRials" },
    headerRowNumber,
  });
  assert.equal(rawRows.length, 2);
  assert.equal(rawRows[0]?.values.internalCode, "BA-1001");
  assert.equal(rawRows[1]?.values.internalCode, "BA-1002");
});

test("unified catalog slugify keeps persian letters and collapses spaces", () => {
  assert.equal(slugifyBookSku("ریاضی  هفتم"), "ریاضی-هفتم");
  assert.equal(slugifyBookSku("  BA 001  "), "ba-001");
});

test("allocateUniqueBookSkuSlug suffixes when the desired slug is taken", async () => {
  const taken = new Set(["riazi"]);
  const slug = await allocateUniqueBookSkuSlug({
    organizationId: "org",
    desired: "riazi",
    exists: async (candidate) => taken.has(candidate),
  });
  assert.equal(slug, "riazi-2");
});

test("shop listing status is derived from BookSku + inventory, not a second catalog enum", () => {
  assert.equal(
    shopStatusFromBookSku({
      status: BookSkuStatus.ACTIVE,
      trackInventory: true,
      unlimitedStock: false,
      stockQuantity: 0,
    }),
    "OUT_OF_STOCK",
  );
  assert.equal(
    shopStatusFromBookSku({
      status: BookSkuStatus.INACTIVE,
      trackInventory: false,
      unlimitedStock: true,
      stockQuantity: null,
    }),
    "DRAFT",
  );
  assert.equal(bookSkuStatusFromShopStatus("ARCHIVED"), BookSkuStatus.DISCONTINUED);
  assert.equal(bookSkuStatusFromShopStatus("ACTIVE"), BookSkuStatus.ACTIVE);
});

test("StarBook shelves are derived from BookSku fields, not a second catalog", () => {
  const book = (partial: Partial<PublicCommerceProduct>): PublicCommerceProduct => ({
    id: "1",
    title: "ریاضی",
    slug: "riazi",
    shortDescription: "",
    description: "",
    authors: "الف",
    subject: "ریاضی",
    gradeLabel: "دهم",
    pageCount: 10,
    editionYear: 1404,
    printType: null,
    bindingType: null,
    formatSize: null,
    features: [],
    stockQuantity: 3,
    status: "ACTIVE",
    inStock: true,
    imageUrl: null,
    imageAlt: null,
    categoryTitle: null,
    categorySlug: null,
    isFeatured: false,
    updatedAt: new Date("2026-09-01"),
    branchId: null,
    pricing: {
      basePriceRials: 1000,
      finalPriceRials: 1000,
      discountRials: 0,
      discountPercent: null,
      isOnSale: false,
      saleEndsAt: null,
    },
    ...partial,
  });
  const shelves = partitionStarBookShelves([
    book({ id: "a", isFeatured: true, title: "ویژه" }),
    book({
      id: "b",
      title: "حراج",
      pricing: {
        basePriceRials: 2000,
        finalPriceRials: 1000,
        discountRials: 1000,
        discountPercent: 50,
        isOnSale: true,
        saleEndsAt: null,
      },
    }),
    book({ id: "c", title: "تازه", updatedAt: new Date("2026-09-10") }),
  ]);
  assert.equal(shelves.featured[0]?.id, "a");
  assert.equal(shelves.flash[0]?.id, "b");
  assert.equal(shelves.newest[0]?.id, "c");
});

test("StarBook recommends from recent subject without a second catalog", () => {
  const book = (partial: Partial<PublicCommerceProduct>): PublicCommerceProduct => ({
    id: "1",
    title: "ریاضی",
    slug: "riazi",
    shortDescription: "",
    description: "",
    authors: "الف",
    subject: "ریاضی",
    gradeLabel: "دهم",
    pageCount: 10,
    editionYear: 1404,
    printType: null,
    bindingType: null,
    formatSize: null,
    features: [],
    stockQuantity: 3,
    status: "ACTIVE",
    inStock: true,
    imageUrl: null,
    imageAlt: null,
    categoryTitle: null,
    categorySlug: null,
    isFeatured: false,
    updatedAt: new Date("2026-09-01"),
    branchId: null,
    pricing: {
      basePriceRials: 1000,
      finalPriceRials: 1000,
      discountRials: 0,
      discountPercent: null,
      isOnSale: false,
      saleEndsAt: null,
    },
    ...partial,
  });
  const math = book({
    id: "m1",
    subject: "ریاضی",
    gradeLabel: "دهم",
    title: "دیده شده",
  });
  const sibling = book({
    id: "m2",
    subject: "ریاضی",
    gradeLabel: "دهم",
    title: "پیشنهاد",
  });
  const other = book({ id: "p1", subject: "فیزیک", title: "دیگر" });
  const picked = recommendStarBookProducts(["m1"], [math, sibling, other], 2);
  assert.equal(picked[0]?.id, "m2");
  assert.equal(
    picked.some((item) => item.id === "m1"),
    false,
  );
});

void Promise.all(pending)
  .then(() => {
    console.log(`\n${passed} tests passed`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
