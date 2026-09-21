/**
 * Unit tests — counselor students Excel export helpers.
 */

import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  counselorStudentsExportFilename,
  escapeExcelCell,
  formatBooleanFa,
  journeyProgressFromPlan,
  rialsToTomanNumber,
} from "@/lib/counselor-os/students-export/format";
import {
  buildEighteenStepSheetHeaders,
  exportJourneyStepStatusLabel,
  resolveExportJourneyStepStatus,
} from "@/lib/counselor-os/students-export/step-status";
import {
  buildCounselorStudentsExportWorkbook,
  counselorStudentsWorkbookToBuffer,
} from "@/lib/counselor-os/students-export/xlsx";
import { MAIN_SHEET_HEADERS, mainRowToCells } from "@/lib/counselor-os/students-export/load-data";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";

async function main() {
  assert.equal(escapeExcelCell("09121234567"), "09121234567");
  assert.equal(escapeExcelCell("=1+1"), "'=1+1");
  assert.equal(escapeExcelCell("+cmd"), "'+cmd");
  assert.equal(rialsToTomanNumber(125000), 12500);
  assert.equal(rialsToTomanNumber(null), null);
  assert.equal(formatBooleanFa(true), "بله");
  assert.equal(formatBooleanFa(false), "خیر");

  const p = journeyProgressFromPlan({
    currentStep: 5,
    completedSteps: [1, 2, 3, 4],
    completionPercentage: 22,
  });
  assert.equal(p.currentStep, 5);
  assert.equal(p.completedCount, 4);
  assert.equal(p.completionPercentage, 22);

  const completed = resolveExportJourneyStepStatus({
    stepNumber: 2,
    currentStep: 5,
    completedSteps: [1, 2],
    openRevisionSteps: [],
    needsReviewFlags: {},
  });
  assert.equal(completed, "completed");
  const locked = resolveExportJourneyStepStatus({
    stepNumber: 9,
    currentStep: 5,
    completedSteps: [1, 2, 3, 4],
    openRevisionSteps: [],
    needsReviewFlags: {},
  });
  assert.equal(locked, "gate_locked");
  assert.equal(exportJourneyStepStatusLabel(locked), "قفل‌شده توسط گیت واقعی");
  assert.equal(buildEighteenStepSheetHeaders().length, 7 + 18 * 3);

  const name = counselorStudentsExportFilename(new Date("2026-09-20T12:00:00Z"));
  assert.match(name, /^دانش‌آموزان-هدایت-تحصیلی-[\u06F0-\u06F9]{4}-[\u06F0-\u06F9]{2}-[\u06F0-\u06F9]{2}\.xlsx$/);

  const sampleRow = {
    row: 1,
    firstName: "علی",
    lastName: "رضایی",
    fullName: "علی رضایی",
    planPublicId: "PLAN001",
    studentMobile: "09120001111",
    guardianMobile: "09123334444",
    guardianName: "والد",
    gender: "پسر",
    birthDateJalali: "1388/01/01",
    province: "تهران",
    city: "تهران",
    district: "1",
    school: "دبیرستان",
    grade: "دوازدهم",
    track: "ریاضی",
    quotaType: "NORMAL",
    konkurRegion: "1",
    overallAverage: 18.5,
    writtenFinalAverage: 18.5,
    rankOrTaraz: "12000",
    counselorName: "مشاور",
    studentStatus: "فعال",
    currentStepTitle: "مرحله ۱",
    currentStepNumber: 1,
    lastCompletedStepTitle: "",
    completedStepCount: 0,
    completionPercentage: 0,
    needsFollowUp: "خیر",
    counselorReviewStatus: "",
    revisionStep: null,
    revisionMessage: "",
    hollandDone: "خیر",
    hollandLastAt: "",
    hollandAttemptCount: 0,
    hollandDominantType: "",
    hollandBasisCode: "",
    documentStatus: "",
    transcriptUploaded: "خیر",
    packageName: "",
    farhangianAddon: "خیر",
    financeStatus: "",
    baseAmountToman: null,
    discountAmountToman: null,
    paidAmountToman: null,
    discountCode: "",
    paidAt: "",
    firstSessionBooked: "خیر",
    firstSessionStatus: "",
    firstSessionAt: "",
    secondSessionBooked: "خیر",
    secondSessionStatus: "",
    secondSessionAt: "",
    draftChoiceCount: null,
    publishedChoiceCount: null,
    arrangementStatus: "",
    sanjeshTracking: "",
    sanjeshTrackingAt: "",
    sanjeshStatusLabel: "",
    planCreatedAt: formatJalaliDateTimeShort(new Date()),
    lastActivityAt: "",
    daysSinceActivity: null,
    studentId: "stu1",
    hollandPaid: "خیر",
  };

  const stepRow: Array<string | number | null> = [
    1,
    "علی رضایی",
    "09120001111",
    "PLAN001",
    "مشاور",
    "مرحله ۱",
    0,
  ];
  for (let i = 0; i < 18 * 3; i += 1) stepRow.push(i % 3 === 0 ? "شروع نشده" : "");

  const workbook = await buildCounselorStudentsExportWorkbook({
    mainRows: [sampleRow],
    stepRows: [stepRow],
    hollandRows: [],
  });
  assert.equal(workbook.worksheets.length, 3);
  const main = workbook.getWorksheet("دانش‌آموزان")!;
  assert.ok(main.views?.[0]?.rightToLeft);
  assert.ok(main.autoFilter);
  assert.equal(main.rowCount, 2);
  assert.equal(main.columnCount, MAIN_SHEET_HEADERS.length);
  assert.equal(mainRowToCells(sampleRow).length, MAIN_SHEET_HEADERS.length);
  assert.equal(main.getRow(2).getCell(6).numFmt, "@");

  const buffer = await counselorStudentsWorkbookToBuffer(workbook);
  const parsed = new ExcelJS.Workbook();
  await parsed.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  assert.equal(parsed.worksheets.length, 3);

  console.log("ok counselor-students-export-unit-tests");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
