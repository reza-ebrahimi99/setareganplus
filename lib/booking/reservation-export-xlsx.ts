/**
 * Premium reservation Excel export — reuses the exceljs dependency already
 * used by lib/commerce/orders/export-xlsx.ts and lib/forms/export-form-responses-xlsx.ts
 * (RTL view, frozen header, autoFilter, auto width — same conventions,
 * extended here with borders, alternating rows, a colored stats dashboard,
 * and a second breakdown sheet).
 */

import ExcelJS from "exceljs";
import type { BookingReservationExportFilters } from "@/lib/booking/reservation-export-filters";
import {
  loadBookingReservationsForExport,
  type BookingExportRow,
} from "@/lib/booking/reservation-export-query";
import {
  BOOKING_EXPORT_STATUS_LABELS,
  buildBookingExportSummary,
  type BookingExportCountRow,
  type BookingExportSummary,
} from "@/lib/booking/reservation-export-summary";
import { formatJalaliDateShort, formatJalaliDateTimeShort, PERSIAN_WEEKDAYS } from "@/lib/datetime/jalali";
import { formatTehranTime24, getPersianWeekdayIndex } from "@/lib/datetime/tehran-zone";
import { toPersianDigits } from "@/lib/persian";

export type ExportBookingReservationsXlsxResult =
  | { ok: true; filename: string; buffer: Buffer }
  | { ok: false; reason: "unavailable" };

const MAIN_COLUMN_COUNT = 11;

// Brand-consistent palette (matches app/globals.css --primary/--success/--danger).
const HEADER_FILL = "FF0F172A";
const HEADER_FONT = "FFFFFFFF";
const ALT_ROW_FILL = "FFF8FAFC";
const BORDER_ARGB = "FFCBD5E1";
const TITLE_FONT = "FF0F172A";

const CARD_STYLES = {
  total: { fill: "FF0F172A", font: "FFFFFFFF" },
  confirmed: { fill: "FF15803D", font: "FFFFFFFF" },
  pending: { fill: "FFD97706", font: "FFFFFFFF" },
  cancelled: { fill: "FFB91C1C", font: "FFFFFFFF" },
  completed: { fill: "FF0369A1", font: "FFFFFFFF" },
  noShow: { fill: "FF64748B", font: "FFFFFFFF" },
} as const;

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: ExcelJS.Border = { style: "thin", color: { argb: BORDER_ARGB } };
  return { top: side, left: side, bottom: side, right: side };
}

function fillArgb(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function applyLandscapeA4(sheet: ExcelJS.Worksheet): void {
  sheet.pageSetup = {
    orientation: "landscape",
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
  };
}

/** Writes one label+value stat card spanning [colStart, colEnd] across two rows. */
function writeStatCard(
  sheet: ExcelJS.Worksheet,
  labelRow: number,
  valueRow: number,
  colStart: number,
  colEnd: number,
  label: string,
  value: number,
  style: { fill: string; font: string },
): void {
  sheet.mergeCells(labelRow, colStart, labelRow, colEnd);
  sheet.mergeCells(valueRow, colStart, valueRow, colEnd);
  const labelCell = sheet.getRow(labelRow).getCell(colStart);
  labelCell.value = label;
  labelCell.font = { bold: true, color: { argb: style.font }, size: 11 };
  labelCell.alignment = { horizontal: "center", vertical: "middle" };
  labelCell.fill = fillArgb(style.fill);

  const valueCell = sheet.getRow(valueRow).getCell(colStart);
  valueCell.value = toPersianDigits(String(value));
  valueCell.font = { bold: true, color: { argb: style.font }, size: 18 };
  valueCell.alignment = { horizontal: "center", vertical: "middle" };
  valueCell.fill = fillArgb(style.fill);

  for (let col = colStart; col <= colEnd; col += 1) {
    sheet.getRow(labelRow).getCell(col).border = thinBorder();
    sheet.getRow(valueRow).getCell(col).border = thinBorder();
  }
}

function writeStatsDashboard(sheet: ExcelJS.Worksheet, summary: BookingExportSummary): number {
  // Row 1: title, Row 2: subtitle, Row 3: spacer, Rows 4-7: two card groups.
  sheet.mergeCells(1, 1, 1, MAIN_COLUMN_COUNT);
  const title = sheet.getRow(1).getCell(1);
  title.value = "گزارش مدیریتی رزروها";
  title.font = { bold: true, size: 16, color: { argb: TITLE_FONT } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(2, 1, 2, MAIN_COLUMN_COUNT);
  const subtitle = sheet.getRow(2).getCell(1);
  subtitle.value = `تاریخ تولید گزارش: ${formatJalaliDateTimeShort(new Date())}`;
  subtitle.font = { italic: true, size: 10, color: { argb: "FF64748B" } };
  subtitle.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 18;

  sheet.getRow(3).height = 6;

  writeStatCard(sheet, 4, 5, 1, 4, "کل رزروها", summary.total, CARD_STYLES.total);
  writeStatCard(sheet, 4, 5, 5, 8, "تایید شده", summary.confirmed, CARD_STYLES.confirmed);
  writeStatCard(sheet, 4, 5, 9, 11, "در انتظار", summary.pending, CARD_STYLES.pending);
  writeStatCard(sheet, 6, 7, 1, 4, "لغو شده", summary.cancelled, CARD_STYLES.cancelled);
  writeStatCard(sheet, 6, 7, 5, 8, "تکمیل شده", summary.completed, CARD_STYLES.completed);
  writeStatCard(sheet, 6, 7, 9, 11, "عدم حضور", summary.noShow, CARD_STYLES.noShow);
  sheet.getRow(4).height = 16;
  sheet.getRow(5).height = 24;
  sheet.getRow(6).height = 16;
  sheet.getRow(7).height = 24;

  sheet.getRow(8).height = 8;

  return 9; // next free row = the main table header row
}

const MAIN_HEADERS = [
  "ردیف",
  "تاریخ رزرو (شمسی)",
  "روز هفته",
  "ساعت",
  "نام دانش‌آموز",
  "شماره موبایل",
  "خدمت",
  "وضعیت",
  "کد رهگیری",
  "تاریخ ثبت",
  "توضیحات",
] as const;

const MAIN_COLUMN_WIDTHS = [8, 20, 14, 10, 24, 16, 26, 14, 16, 20, 32];

function writeMainTable(
  sheet: ExcelJS.Worksheet,
  headerRow: number,
  rows: readonly BookingExportRow[],
): void {
  const header = sheet.getRow(headerRow);
  MAIN_HEADERS.forEach((label, index) => {
    const cell = header.getCell(index + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 11 };
    cell.fill = fillArgb(HEADER_FILL);
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder();
  });
  header.height = 22;

  rows.forEach((row, index) => {
    const excelRow = sheet.getRow(headerRow + 1 + index);
    const weekday = PERSIAN_WEEKDAYS[getPersianWeekdayIndex(row.startsAt)];
    excelRow.values = [
      toPersianDigits(String(index + 1)),
      formatJalaliDateShort(row.startsAt),
      weekday,
      toPersianDigits(formatTehranTime24(row.startsAt)),
      row.studentName || "—",
      row.mobile ? toPersianDigits(row.mobile) : "—",
      row.serviceTitle,
      BOOKING_EXPORT_STATUS_LABELS[row.status] ?? row.status,
      toPersianDigits(row.trackingCode),
      formatJalaliDateTimeShort(row.createdAt),
      row.notes?.trim() || "—",
    ];
    const isAlt = index % 2 === 1;
    for (let col = 1; col <= MAIN_COLUMN_COUNT; col += 1) {
      const cell = excelRow.getCell(col);
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: col === 11 };
      cell.border = thinBorder();
      if (isAlt) cell.fill = fillArgb(ALT_ROW_FILL);
    }
    excelRow.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
    excelRow.getCell(11).alignment = { horizontal: "right", vertical: "middle", wrapText: true };
  });

  MAIN_COLUMN_WIDTHS.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  sheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: headerRow + Math.max(rows.length, 1), column: MAIN_COLUMN_COUNT },
  };
}

function writeBreakdownTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  title: string,
  columns: readonly [string, string],
  rows: readonly BookingExportCountRow[],
): number {
  sheet.mergeCells(startRow, 1, startRow, 2);
  const titleCell = sheet.getRow(startRow).getCell(1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 13, color: { argb: TITLE_FONT } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(startRow).height = 22;

  const headerRow = startRow + 1;
  const header = sheet.getRow(headerRow);
  columns.forEach((label, index) => {
    const cell = header.getCell(index + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: HEADER_FONT } };
    cell.fill = fillArgb(HEADER_FILL);
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder();
  });

  rows.forEach((row, index) => {
    const excelRow = sheet.getRow(headerRow + 1 + index);
    excelRow.getCell(1).value = row.label;
    excelRow.getCell(2).value = toPersianDigits(String(row.count));
    const isAlt = index % 2 === 1;
    for (let col = 1; col <= 2; col += 1) {
      const cell = excelRow.getCell(col);
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = thinBorder();
      if (isAlt) cell.fill = fillArgb(ALT_ROW_FILL);
    }
  });

  if (rows.length === 0) {
    const emptyRow = sheet.getRow(headerRow + 1);
    sheet.mergeCells(headerRow + 1, 1, headerRow + 1, 2);
    emptyRow.getCell(1).value = "داده‌ای برای نمایش وجود ندارد.";
    emptyRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    emptyRow.getCell(1).border = thinBorder();
    return headerRow + 3;
  }

  return headerRow + rows.length + 2; // + spacer row
}

function writeSummarySheet(sheet: ExcelJS.Worksheet, summary: BookingExportSummary): void {
  sheet.getColumn(1).width = 26;
  sheet.getColumn(2).width = 16;

  let row = 1;
  row = writeBreakdownTable(sheet, row, "رزرو بر اساس روز", ["تاریخ", "تعداد"], summary.byDay);
  row = writeBreakdownTable(sheet, row, "رزرو بر اساس ساعت", ["ساعت", "تعداد"], summary.byHour);
  row = writeBreakdownTable(sheet, row, "رزرو بر اساس خدمت", ["خدمت", "تعداد"], summary.byService);
  writeBreakdownTable(sheet, row, "رزرو بر اساس وضعیت", ["وضعیت", "تعداد"], summary.byStatus);

  applyLandscapeA4(sheet);
}

/** Pure workbook builder — no I/O, fully unit-testable without a database. */
export function buildBookingReservationsWorkbook(
  rows: readonly BookingExportRow[],
): ExcelJS.Workbook {
  const summary = buildBookingExportSummary(rows);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "StarOS";
  workbook.created = new Date();

  const mainSheet = workbook.addWorksheet("رزروها", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 9 }],
  });
  const headerRow = writeStatsDashboard(mainSheet, summary);
  writeMainTable(mainSheet, headerRow, rows);
  applyLandscapeA4(mainSheet);

  const summarySheet = workbook.addWorksheet("خلاصه", {
    views: [{ rightToLeft: true }],
  });
  writeSummarySheet(summarySheet, summary);

  return workbook;
}

export async function exportBookingReservationsXlsx(params: {
  organizationId: string;
  allowedBranchIds?: readonly string[] | null;
  filters: BookingReservationExportFilters;
}): Promise<ExportBookingReservationsXlsxResult> {
  try {
    const rows = await loadBookingReservationsForExport({
      organizationId: params.organizationId,
      allowedBranchIds: params.allowedBranchIds,
      filters: params.filters,
    });
    const workbook = buildBookingReservationsWorkbook(rows);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const stamp = new Date().toISOString().slice(0, 10);
    return {
      ok: true,
      filename: `bookings-export-${stamp}.xlsx`,
      buffer,
    };
  } catch (error) {
    console.error("[booking-export] xlsx failed", error);
    return { ok: false, reason: "unavailable" };
  }
}
