/**
 * Counselor students export — Excel workbook (3 sheets, RTL, filters, styling).
 */

import ExcelJS from "exceljs";
import { escapeExcelCell } from "@/lib/counselor-os/students-export/format";
import { buildEighteenStepSheetHeaders } from "@/lib/counselor-os/students-export/step-status";
import {
  MAIN_SHEET_HEADERS,
  mainRowToCells,
  type CounselorStudentsExportHollandRow,
  type CounselorStudentsExportMainRow,
} from "@/lib/counselor-os/students-export/load-data";

const HEADER_FILL = "FF0F172A";
const HEADER_FONT = "FFFFFFFF";
const ALT_ROW_FILL = "FFF8FAFC";
const BORDER_ARGB = "FFCBD5E1";

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: ExcelJS.Border = { style: "thin", color: { argb: BORDER_ARGB } };
  return { top: side, left: side, bottom: side, right: side };
}

function fillArgb(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function cellValue(value: string | number | null | undefined): string | number {
  if (value == null || value === "") return "";
  if (typeof value === "number") return value;
  return escapeExcelCell(value);
}

function styleSheetTable(
  sheet: ExcelJS.Worksheet,
  headers: readonly string[],
  rows: Array<Array<string | number | null>>,
  textColumnIndexes: Set<number>,
): void {
  sheet.views = [{ state: "frozen", ySplit: 1, rightToLeft: true }];

  const headerRow = sheet.getRow(1);
  headers.forEach((label, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 11 };
    cell.fill = fillArgb(HEADER_FILL);
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder();
  });
  headerRow.height = 22;

  rows.forEach((rowValues, rowIndex) => {
    const excelRow = sheet.getRow(rowIndex + 2);
    rowValues.forEach((raw, colIndex) => {
      const cell = excelRow.getCell(colIndex + 1);
      const val = cellValue(raw);
      if (textColumnIndexes.has(colIndex + 1) && val !== "") {
        cell.value = String(val);
        cell.numFmt = "@";
      } else {
        cell.value = val;
      }
      cell.alignment = {
        horizontal: colIndex === 0 ? "center" : "right",
        vertical: "middle",
        wrapText: true,
      };
      cell.border = thinBorder();
      if (rowIndex % 2 === 1) {
        cell.fill = fillArgb(ALT_ROW_FILL);
      }
    });
  });

  headers.forEach((label, index) => {
    const col = sheet.getColumn(index + 1);
    col.width = Math.min(42, Math.max(10, label.length + 4));
  });

  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: rows.length + 1, column: headers.length },
    };
  }

}

const HOLLAND_HEADERS = [
  "ردیف",
  "نام و نام خانوادگی",
  "موبایل",
  "شناسه پرونده",
  "شماره attempt",
  "وضعیت attempt",
  "نتیجه مبنا؟",
  "تاریخ شروع",
  "تاریخ تکمیل",
  "کد هالند",
  "تیپ اول",
  "امتیاز تیپ اول",
  "تیپ دوم",
  "امتیاز تیپ دوم",
  "تیپ سوم",
  "امتیاز تیپ سوم",
  "R",
  "I",
  "A",
  "S",
  "E",
  "C",
  "درخواست تکرار توسط",
  "دلیل تکرار",
  "وضعیت بررسی مشاور",
] as const;

function hollandRowToCells(row: CounselorStudentsExportHollandRow): Array<string | number | null> {
  return [
    row.row,
    row.fullName,
    row.mobile,
    row.planPublicId,
    row.attemptNumber,
    row.attemptStatus,
    row.isBasis,
    row.startedAt,
    row.completedAt,
    row.hollandCode,
    row.type1,
    row.score1,
    row.type2,
    row.score2,
    row.type3,
    row.score3,
    row.R,
    row.I,
    row.A,
    row.S,
    row.E,
    row.C,
    row.retakeRequestedBy,
    row.retakeReason,
    row.counselorReview,
  ];
}

export async function buildCounselorStudentsExportWorkbook(params: {
  mainRows: CounselorStudentsExportMainRow[];
  stepRows: Array<Array<string | number | null>>;
  hollandRows: CounselorStudentsExportHollandRow[];
  siteOrigin?: string;
}): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SetareganPlus Counselor OS";
  workbook.created = new Date();

  const mainSheet = workbook.addWorksheet("دانش‌آموزان", {
    views: [{ rightToLeft: true }],
  });
  const mainData = params.mainRows.map((r) => mainRowToCells(r));
  const mainTextCols = new Set<number>([
    5, 6, 7, 21, 37, 46, 57,
  ]);
  styleSheetTable(mainSheet, MAIN_SHEET_HEADERS, mainData, mainTextCols);

  if (params.siteOrigin) {
    const linkCol = 5;
    params.mainRows.forEach((row, index) => {
      if (!row.studentId) return;
      const url = `${params.siteOrigin}/admin/counselor/students/${row.studentId}`;
      const cell = mainSheet.getRow(index + 2).getCell(linkCol);
      if (row.planPublicId) {
        cell.value = {
          text: escapeExcelCell(String(row.planPublicId)),
          hyperlink: url,
        };
        cell.font = { color: { argb: "FF2563EB" }, underline: true };
      }
    });
  }

  const stepsSheet = workbook.addWorksheet("وضعیت ۱۸ مرحله", {
    views: [{ rightToLeft: true }],
  });
  const stepHeaders = buildEighteenStepSheetHeaders();
  const stepTextCols = new Set<number>([3, 4]);
  styleSheetTable(stepsSheet, stepHeaders, params.stepRows, stepTextCols);

  const hollandSheet = workbook.addWorksheet("رغبت‌سنجی", {
    views: [{ rightToLeft: true }],
  });
  const hollandData = params.hollandRows.map(hollandRowToCells);
  const hollandTextCols = new Set<number>([3, 4, 10]);
  styleSheetTable(hollandSheet, HOLLAND_HEADERS, hollandData, hollandTextCols);

  return workbook;
}

export async function counselorStudentsWorkbookToBuffer(
  workbook: ExcelJS.Workbook,
): Promise<Buffer> {
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
