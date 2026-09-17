import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveGhalamchiInternalCode,
  validateMappedCatalogRows,
  type RawCatalogRow,
} from "../lib/books/catalog/import-parser";
import { calculateOrderTotals } from "../lib/commerce/orders/totals";

function row(values: RawCatalogRow["values"], excelRowNumber = 2): RawCatalogRow {
  return { excelRowNumber, values, hasFormula: false };
}

test("SKU rule: internal code is used when present", () => {
  const { validRows } = validateMappedCatalogRows([
    row({ internalCode: "GH-777", barcode: "9786001234567", title: "ریاضی", listPriceRials: "1000" }),
  ]);
  assert.equal(validRows[0]?.internalCode, "GH-777");
});

test("SKU rule: missing code derives a stable code from barcode", () => {
  const derived = deriveGhalamchiInternalCode("978-600-123-456-7");
  assert.equal(derived, "GH-9786001234567");
  const { validRows } = validateMappedCatalogRows([
    row({ barcode: "978-600-123-456-7", title: "فیزیک", listPriceRials: "2000" }),
  ]);
  assert.equal(validRows[0]?.internalCode, "GH-9786001234567");
});

test("SKU rule: same barcode across imports yields the same code (no duplicates)", () => {
  assert.equal(
    deriveGhalamchiInternalCode("9786001234567"),
    deriveGhalamchiInternalCode("9786001234567"),
  );
});

test("SKU rule: missing code and missing barcode is an error", () => {
  const { validRows, invalidRows } = validateMappedCatalogRows([
    row({ title: "بدون کد", listPriceRials: "3000" }),
  ]);
  assert.equal(validRows.length, 0);
  assert.equal(invalidRows.length, 1);
  assert.ok(invalidRows[0]?.errors.some((e) => e.includes("کد کتاب یا بارکد")));
});

test("initial stock parses as a non-negative integer; negatives are rejected", () => {
  const ok = validateMappedCatalogRows([
    row({ internalCode: "A1", title: "کتاب", listPriceRials: "1000", initialStock: "۱۲" }),
  ]);
  assert.equal(ok.validRows[0]?.initialStock, 12);

  const bad = validateMappedCatalogRows([
    row({ internalCode: "A2", title: "کتاب", listPriceRials: "1000", initialStock: "-3" }),
  ]);
  assert.equal(bad.invalidRows.length, 1);
});

test("active flag maps فعال/غیرفعال (and blank = untouched)", () => {
  const on = validateMappedCatalogRows([
    row({ internalCode: "A3", title: "ک", listPriceRials: "1", isActive: "فعال" }),
  ]);
  assert.equal(on.validRows[0]?.isActive, true);
  const off = validateMappedCatalogRows([
    row({ internalCode: "A4", title: "ک", listPriceRials: "1", isActive: "غیرفعال" }),
  ]);
  assert.equal(off.validRows[0]?.isActive, false);
  const blank = validateMappedCatalogRows([
    row({ internalCode: "A5", title: "ک", listPriceRials: "1" }),
  ]);
  assert.equal(blank.validRows[0]?.isActive, null);
});

test("POS totals sum multiple lines and quantities", () => {
  const totals = calculateOrderTotals({
    lines: [
      { titleSnapshot: "الف", systemKindSnapshot: "PHYSICAL", unitPriceRials: 1000, quantity: 2 },
      { titleSnapshot: "ب", systemKindSnapshot: "PHYSICAL", unitPriceRials: 500, quantity: 3 },
    ],
  });
  assert.equal(totals.subtotalRials, 3500);
  assert.equal(totals.grandTotalRials, 3500);
  assert.equal(totals.lines.length, 2);
});
