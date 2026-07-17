/**
 * Pure CRM import tests. No database connection is created.
 */

import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  buildImportResultCsv,
  detectImportHeaderAlias,
  inspectLeadImportFile,
  isValidImportEmail,
  protectCsvFormula,
  splitImportFullName,
  validateMappedImportRows,
} from "../lib/crm/import-parser";
import { toLatinDigits } from "../lib/forms/latin-digits";
import { normalizeIranianMobile } from "../lib/forms/normalize-mobile";

let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

test("Persian and Arabic digits normalize to Latin", () => {
  assert.equal(toLatinDigits("۰۱۲۳۴۵۶۷۸۹"), "0123456789");
  assert.equal(toLatinDigits("٠١٢٣٤٥٦٧٨٩"), "0123456789");
});

test("Iranian mobile variants normalize consistently", () => {
  for (const value of ["09121234567", "989121234567", "+989121234567"]) {
    const result = normalizeIranianMobile(value);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.normalized, "09121234567");
  }
});

test("header aliases detect Persian and English columns", () => {
  assert.equal(detectImportHeaderAlias("شماره موبایل"), "mobile");
  assert.equal(detectImportHeaderAlias("نام خانوادگی"), "lastName");
  assert.equal(detectImportHeaderAlias("E-mail"), "email");
  assert.equal(detectImportHeaderAlias("ستون ناشناخته"), "IGNORE");
});

test("invalid mobile returns a Persian row error", () => {
  const result = validateMappedImportRows([
    {
      excelRowNumber: 2,
      values: { firstName: "علی", lastName: "رضایی", mobile: "123" },
    },
  ]);
  assert.equal(result.validRows.length, 0);
  assert.equal(result.invalidRows.length, 1);
  assert.match(result.invalidRows[0]!.errors.join(" "), /موبایل/);
});

test("duplicate mobiles inside the file are rejected after first row", () => {
  const result = validateMappedImportRows([
    {
      excelRowNumber: 2,
      values: { firstName: "علی", lastName: "رضایی", mobile: "09121234567" },
    },
    {
      excelRowNumber: 3,
      values: { firstName: "مریم", lastName: "احمدی", mobile: "+989121234567" },
    },
  ]);
  assert.equal(result.validRows.length, 1);
  assert.equal(result.invalidRows.length, 1);
  assert.match(result.invalidRows[0]!.errors.join(" "), /همین فایل تکراری/);
});

test("full name splits conservatively", () => {
  assert.deepEqual(splitImportFullName("علی رضا محمدی"), {
    firstName: "علی",
    lastName: "رضا محمدی",
  });
  assert.equal(splitImportFullName("علی"), null);
  const parsed = validateMappedImportRows([
    {
      excelRowNumber: 2,
      values: { fullName: "سارا اکبری", mobile: "09121111111" },
    },
  ]);
  assert.equal(parsed.validRows[0]?.profile.firstName, "سارا");
  assert.equal(parsed.validRows[0]?.profile.lastName, "اکبری");
});

test("email validation accepts normal addresses and rejects malformed values", () => {
  assert.equal(isValidImportEmail("user@example.com"), true);
  assert.equal(isValidImportEmail("invalid@"), false);
  const parsed = validateMappedImportRows([
    {
      excelRowNumber: 2,
      values: {
        firstName: "رضا",
        lastName: "کریمی",
        mobile: "09123334444",
        email: "invalid@",
      },
    },
  ]);
  assert.match(parsed.invalidRows[0]!.errors.join(" "), /ایمیل/);
});

test("CSV cells are protected against formula injection", () => {
  assert.equal(protectCsvFormula("=1+1"), "'=1+1");
  assert.equal(protectCsvFormula("+SUM(A1:A2)"), "'+SUM(A1:A2)");
  assert.equal(protectCsvFormula("-10"), "'-10");
  assert.equal(protectCsvFormula("@cmd"), "'@cmd");
  assert.equal(protectCsvFormula("متن عادی"), "متن عادی");
});

test("result CSV has UTF-8 BOM and protected Persian output", () => {
  const csv = buildImportResultCsv([
    {
      excelRowNumber: 2,
      status: "خطا",
      mobile: "09121234567",
      name: "=HYPERLINK",
      message: "پیام",
    },
  ]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.includes("شماره ردیف اکسل"));
  assert.ok(csv.includes("'=HYPERLINK"));
});

async function testWorkbookReaders() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("لیدها");
  worksheet.addRow(["نام کامل", "موبایل"]);
  worksheet.addRow(["علی رضایی", "09121234567"]);
  const xlsxBytes = await workbook.xlsx.writeBuffer();
  const xlsxInspection = await inspectLeadImportFile(
    new File([xlsxBytes as BlobPart], "leads.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  assert.equal(xlsxInspection.selectedSheet, "لیدها");
  assert.equal(xlsxInspection.totalRows, 1);
  passed += 1;
  console.log("✓ XLSX reader returns headers and preview");

  const csvInspection = await inspectLeadImportFile(
    new File(
      ["\uFEFF\nنام کامل,موبایل\nمریم احمدی,09123334444\n"],
      "leads.csv",
      { type: "text/csv" },
    ),
  );
  assert.equal(csvInspection.totalRows, 1);
  assert.equal(csvInspection.headers[0]?.suggestedField, "fullName");
  passed += 1;
  console.log("✓ CSV reader uses first non-empty row as header");
}

testWorkbookReaders()
  .then(() => {
    console.log(`\nAll ${passed} CRM import unit tests passed.`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
