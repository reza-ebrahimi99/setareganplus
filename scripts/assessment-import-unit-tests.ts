/**
 * Pure Assessment import normalization / validation helpers. No database.
 */

import assert from "node:assert/strict";
import { toLatinDigits } from "../lib/forms/latin-digits";
import {
  isAllowedAssessmentImportFile,
  isValidNonNegative,
  isValidPercentage,
  isValidRank,
  ASSESSMENT_IMPORT_MAX_BYTES,
} from "../lib/assessment/import-shared";
import { parseImportNumber } from "../lib/assessment/import";

let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

test("Persian and Arabic digits normalize via shared helper", () => {
  assert.equal(toLatinDigits("۰۱۲۳۴۵۶۷۸۹"), "0123456789");
  assert.equal(toLatinDigits("٠١٢٣٤٥٦٧٨٩"), "0123456789");
});

test("parseImportNumber accepts Persian/Arabic digits and separators", () => {
  assert.equal(parseImportNumber("۱٬۲۳۴٫۵"), 1234.5);
  assert.equal(parseImportNumber("۱۲۳۴.۵"), 1234.5);
  assert.equal(parseImportNumber("٠١٢"), 12);
  assert.equal(parseImportNumber(""), null);
  assert.equal(parseImportNumber("abc"), null);
});

test("file allowlist enforces size and extension", () => {
  assert.equal(
    isAllowedAssessmentImportFile({
      name: "results.xlsx",
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: 1024,
    }).ok,
    true,
  );
  assert.equal(
    isAllowedAssessmentImportFile({
      name: "results.exe",
      type: "application/octet-stream",
      size: 1024,
    }).ok,
    false,
  );
  assert.equal(
    isAllowedAssessmentImportFile({
      name: "results.csv",
      type: "text/csv",
      size: ASSESSMENT_IMPORT_MAX_BYTES + 1,
    }).ok,
    false,
  );
});

test("percentage / rank / non-negative validators", () => {
  assert.equal(isValidPercentage(null), true);
  assert.equal(isValidPercentage(0), true);
  assert.equal(isValidPercentage(100), true);
  assert.equal(isValidPercentage(101), false);
  assert.equal(isValidPercentage(-1), false);
  assert.equal(isValidRank(1), true);
  assert.equal(isValidRank(0), false);
  assert.equal(isValidRank(1.5), false);
  assert.equal(isValidNonNegative(0), true);
  assert.equal(isValidNonNegative(-0.1), false);
});

console.log(`\n${passed} assessment import unit tests passed.`);
