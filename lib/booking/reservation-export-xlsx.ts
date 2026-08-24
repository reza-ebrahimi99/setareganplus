/**
 * Premium reservation Excel export — reuses the exceljs dependency already
 * used by lib/commerce/orders/export-xlsx.ts and lib/forms/export-form-responses-xlsx.ts
 * (RTL view, frozen header, autoFilter, auto width — same conventions,
 * extended here with borders, alternating rows, a colored stats dashboard,
 * a brand banner + active-filters line, and a second executive-summary sheet).
 *
 * exceljs (v4) has no native chart API (Workbook/Worksheet expose no
 * addChart/chart methods), so the "chart" requirement for the summary sheet
 * is met with premium formatted tables instead: each breakdown table gets an
 * inline proportional bar column (Unicode block characters), which reads as
 * a chart at a glance without any extra dependency.
 */

import ExcelJS from "exceljs";
import {
  describeBookingReservationExportFilters,
  type BookingReservationExportFilters,
} from "@/lib/booking/reservation-export-filters";
import {
  loadBookingReservationsForExport,
  loadBookingServiceTitleForExport,
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
const SUMMARY_COLUMN_COUNT = 9;

// Brand-consistent palette (matches app/globals.css --primary/--success/--danger).
const HEADER_FILL = "FF0F172A";
const HEADER_FONT = "FFFFFFFF";
const ALT_ROW_FILL = "FFF8FAFC";
const BORDER_ARGB = "FFCBD5E1";
const TITLE_FONT = "FF0F172A";
const MUTED_FONT = "FF64748B";

// Widely available on Windows/Excel with solid Persian glyph coverage —
// avoids falling back to a Latin-only font for RTL text.
const FONT_FAMILY = "Tahoma";

const BRAND_LINE = "SetareganPlus ERP";
const REPORT_TITLE = "گزارش رزرو نوبت‌دهی";

const CARD_STYLES = {
  total: { fill: "FF0F172A", font: "FFFFFFFF" },
  confirmed: { fill: "FF15803D", font: "FFFFFFFF" },
  pending: { fill: "FFD97706", font: "FFFFFFFF" },
  cancelled: { fill: "FFB91C1C", font: "FFFFFFFF" },
  completed: { fill: "FF0369A1", font: "FFFFFFFF" },
  noShow: { fill: "FF64748B", font: "FFFFFFFF" },
  today: { fill: "FF7E22CE", font: "FFFFFFFF" },
  thisWeek: { fill: "FF0F766E", font: "FFFFFFFF" },
  thisMonth: { fill: "FF334155", font: "FFFFFFFF" },
} as const;

/** Centralizes the report's font family so every cell renders Persian text consistently. */
function withFont(overrides: Partial<ExcelJS.Font>): Partial<ExcelJS.Font> {
  return { name: FONT_FAMILY, ...overrides };
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: ExcelJS.Border = { style: "thin", color: { argb: BORDER_ARGB } };
  return { top: side, left: side, bottom: side, right: side };
}

function fillArgb(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

/** 10-cell Unicode bar (█ filled / ░ empty) — the "chart" for a count row. */
function proportionBar(count: number, max: number, width = 10): string {
  if (max <= 0 || count <= 0) return "░".repeat(width);
  const filled = Math.max(1, Math.min(width, Math.round((count / max) * width)));
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function applyLandscapeA4(sheet: ExcelJS.Worksheet, generatedAtLabel: string): void {
  sheet.pageSetup = {
    orientation: "landscape",
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.25 },
  };
  // &L/&C/&R = left/center/right section, &P/&N = current/total page (computed
  // live by Excel at print time — always correct however the sheet paginates).
  // The generation date is baked in as literal text (not the &D "print date"
  // macro) so the footer reflects when the report was produced, not printed.
  const footer = `&L&8${BRAND_LINE}&C&8صفحه &P از &N&R&8${generatedAtLabel}`;
  sheet.headerFooter = { oddFooter: footer, evenFooter: footer };
}

function writeMergedTextRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  text: string,
  font: Partial<ExcelJS.Font>,
  height: number,
  colSpan: number,
  fill?: string,
): void {
  sheet.mergeCells(row, 1, row, colSpan);
  const cell = sheet.getRow(row).getCell(1);
  cell.value = text;
  cell.font = withFont(font);
  cell.alignment = { horizontal: "center", vertical: "middle" };
  if (fill) cell.fill = fillArgb(fill);
  sheet.getRow(row).height = height;
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
  labelCell.font = withFont({ bold: true, color: { argb: style.font }, size: 11 });
  labelCell.alignment = { horizontal: "center", vertical: "middle" };
  labelCell.fill = fillArgb(style.fill);

  const valueCell = sheet.getRow(valueRow).getCell(colStart);
  valueCell.value = toPersianDigits(String(value));
  valueCell.font = withFont({ bold: true, color: { argb: style.font }, size: 18 });
  valueCell.alignment = { horizontal: "center", vertical: "middle" };
  valueCell.fill = fillArgb(style.fill);

  for (let col = colStart; col <= colEnd; col += 1) {
    sheet.getRow(labelRow).getCell(col).border = thinBorder();
    sheet.getRow(valueRow).getCell(col).border = thinBorder();
  }
}

/** Lays out N stat cards evenly across `totalColumns`, spreading any remainder over the first cards. */
function writeStatCardRow(
  sheet: ExcelJS.Worksheet,
  labelRow: number,
  valueRow: number,
  totalColumns: number,
  cards: ReadonlyArray<{ label: string; value: number; style: { fill: string; font: string } }>,
): void {
  const base = Math.floor(totalColumns / cards.length);
  let remainder = totalColumns - base * cards.length;
  let col = 1;
  for (const card of cards) {
    const span = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    const colEnd = col + span - 1;
    writeStatCard(sheet, labelRow, valueRow, col, colEnd, card.label, card.value, card.style);
    col = colEnd + 1;
  }
}

type DashboardContext = {
  title: string;
  filtersDescription: string;
  generatedAtLabel: string;
  totalColumns: number;
};

/**
 * Brand banner + title + generation date + active filters, then three rows
 * of stat cards (Total/Confirmed/Pending, Cancelled/Completed/No-show,
 * Today/This week/This month). Shared by both sheets so the executive
 * summary sheet carries the same at-a-glance dashboard as the main sheet.
 * Returns the next free row.
 */
function writeStatsDashboard(
  sheet: ExcelJS.Worksheet,
  summary: BookingExportSummary,
  context: DashboardContext,
): number {
  const { totalColumns } = context;
  let row = 1;

  writeMergedTextRow(sheet, row, BRAND_LINE, { bold: true, size: 14, color: { argb: HEADER_FONT } }, 26, totalColumns, HEADER_FILL);
  row += 1;
  writeMergedTextRow(sheet, row, context.title, { bold: true, size: 16, color: { argb: TITLE_FONT } }, 28, totalColumns);
  row += 1;
  writeMergedTextRow(
    sheet,
    row,
    `تاریخ تولید گزارش: ${context.generatedAtLabel}`,
    { italic: true, size: 10, color: { argb: MUTED_FONT } },
    18,
    totalColumns,
  );
  row += 1;
  writeMergedTextRow(
    sheet,
    row,
    `فیلترهای اعمال‌شده: ${context.filtersDescription}`,
    { italic: true, size: 10, color: { argb: MUTED_FONT } },
    18,
    totalColumns,
  );
  row += 1;

  sheet.getRow(row).height = 6;
  row += 1;

  const cardGroups: Array<
    ReadonlyArray<{ label: string; value: number; style: { fill: string; font: string } }>
  > = [
    [
      { label: "کل رزروها", value: summary.total, style: CARD_STYLES.total },
      { label: "تایید شده", value: summary.confirmed, style: CARD_STYLES.confirmed },
      { label: "در انتظار", value: summary.pending, style: CARD_STYLES.pending },
    ],
    [
      { label: "لغو شده", value: summary.cancelled, style: CARD_STYLES.cancelled },
      { label: "تکمیل شده", value: summary.completed, style: CARD_STYLES.completed },
      { label: "عدم حضور", value: summary.noShow, style: CARD_STYLES.noShow },
    ],
    [
      { label: "رزرو امروز", value: summary.today, style: CARD_STYLES.today },
      { label: "رزرو این هفته", value: summary.thisWeek, style: CARD_STYLES.thisWeek },
      { label: "رزرو این ماه", value: summary.thisMonth, style: CARD_STYLES.thisMonth },
    ],
  ];

  for (const cards of cardGroups) {
    writeStatCardRow(sheet, row, row + 1, totalColumns, cards);
    sheet.getRow(row).height = 16;
    sheet.getRow(row + 1).height = 24;
    row += 2;
  }

  sheet.getRow(row).height = 8;
  row += 1;

  return row; // next free row
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

/** Sensible minimum per column — real content can still grow beyond this. */
const MAIN_COLUMN_MIN_WIDTHS = [6, 16, 12, 9, 18, 15, 18, 13, 14, 18, 20];
const MAIN_COLUMN_MAX_WIDTH = 45;
const MAIN_ROW_HEIGHT = 20;

function writeMainTable(
  sheet: ExcelJS.Worksheet,
  headerRow: number,
  rows: readonly BookingExportRow[],
): void {
  const header = sheet.getRow(headerRow);
  MAIN_HEADERS.forEach((label, index) => {
    const cell = header.getCell(index + 1);
    cell.value = label;
    cell.font = withFont({ bold: true, color: { argb: HEADER_FONT }, size: 11 });
    cell.fill = fillArgb(HEADER_FILL);
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder();
  });
  header.height = 24;

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
    excelRow.height = MAIN_ROW_HEIGHT;
    const isAlt = index % 2 === 1;
    for (let col = 1; col <= MAIN_COLUMN_COUNT; col += 1) {
      const cell = excelRow.getCell(col);
      cell.font = withFont({ size: 10.5 });
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: col === 11 };
      cell.border = thinBorder();
      if (isAlt) cell.fill = fillArgb(ALT_ROW_FILL);
    }
    excelRow.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
    excelRow.getCell(11).alignment = { horizontal: "right", vertical: "middle", wrapText: true };
  });

  // True auto-width: scan only the header + data rows (never the merged
  // dashboard rows above, whose long title text would otherwise skew every
  // column to the same oversized width).
  for (let col = 1; col <= MAIN_COLUMN_COUNT; col += 1) {
    let maxLen = MAIN_HEADERS[col - 1].length;
    for (let r = headerRow; r <= headerRow + rows.length; r += 1) {
      const len = String(sheet.getRow(r).getCell(col).value ?? "").length;
      if (len > maxLen) maxLen = len;
    }
    const min = MAIN_COLUMN_MIN_WIDTHS[col - 1] ?? 12;
    sheet.getColumn(col).width = Math.min(MAIN_COLUMN_MAX_WIDTH, Math.max(min, maxLen + 2));
  }

  sheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: headerRow + Math.max(rows.length, 1), column: MAIN_COLUMN_COUNT },
  };
  // Repeats the table header row on every printed page (Excel's native
  // "Print Titles" — distinct from the frozen-pane view, which only helps
  // on-screen scrolling).
  sheet.pageSetup.printTitlesRow = `${headerRow}:${headerRow}`;

  const brandRow = headerRow + Math.max(rows.length, 1) + 2;
  writeMergedTextRow(
    sheet,
    brandRow,
    `${BRAND_LINE} — سامانه مدیریت یکپارچه`,
    { italic: true, size: 9, color: { argb: "FF94A3B8" } },
    16,
    MAIN_COLUMN_COUNT,
  );
}

function writeBreakdownTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  title: string,
  columns: readonly [string, string, string],
  rows: readonly BookingExportCountRow[],
): number {
  sheet.mergeCells(startRow, 1, startRow, 3);
  const titleCell = sheet.getRow(startRow).getCell(1);
  titleCell.value = title;
  titleCell.font = withFont({ bold: true, size: 12, color: { argb: TITLE_FONT } });
  titleCell.fill = fillArgb("FFE2E8F0");
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.border = thinBorder();
  sheet.getRow(startRow).getCell(2).border = thinBorder();
  sheet.getRow(startRow).getCell(3).border = thinBorder();
  sheet.getRow(startRow).height = 24;

  const headerRow = startRow + 1;
  const header = sheet.getRow(headerRow);
  columns.forEach((label, index) => {
    const cell = header.getCell(index + 1);
    cell.value = label;
    cell.font = withFont({ bold: true, color: { argb: HEADER_FONT } });
    cell.fill = fillArgb(HEADER_FILL);
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder();
  });

  const maxCount = rows.reduce((max, row) => Math.max(max, row.count), 0);
  rows.forEach((row, index) => {
    const excelRow = sheet.getRow(headerRow + 1 + index);
    excelRow.getCell(1).value = row.label;
    excelRow.getCell(2).value = toPersianDigits(String(row.count));
    excelRow.getCell(3).value = proportionBar(row.count, maxCount);
    const isAlt = index % 2 === 1;
    for (let col = 1; col <= 3; col += 1) {
      const cell = excelRow.getCell(col);
      cell.font = withFont(col === 3 ? { color: { argb: "FF0F766E" } } : {});
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = thinBorder();
      if (isAlt) cell.fill = fillArgb(ALT_ROW_FILL);
    }
  });

  if (rows.length === 0) {
    const emptyRow = sheet.getRow(headerRow + 1);
    sheet.mergeCells(headerRow + 1, 1, headerRow + 1, 3);
    emptyRow.getCell(1).value = "داده‌ای برای نمایش وجود ندارد.";
    emptyRow.getCell(1).font = withFont({});
    emptyRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    emptyRow.getCell(1).border = thinBorder();
    return headerRow + 4;
  }

  return headerRow + rows.length + 3; // + spacer rows for breathing room
}

function writeSummarySheet(
  sheet: ExcelJS.Worksheet,
  summary: BookingExportSummary,
  context: Omit<DashboardContext, "totalColumns">,
): void {
  sheet.getColumn(1).width = 26;
  sheet.getColumn(2).width = 14;
  sheet.getColumn(3).width = 16;
  for (let col = 4; col <= SUMMARY_COLUMN_COUNT; col += 1) {
    sheet.getColumn(col).width = 11;
  }

  const row = writeStatsDashboard(sheet, summary, {
    ...context,
    title: "خلاصه آماری و مدیریتی رزروها",
    totalColumns: SUMMARY_COLUMN_COUNT,
  });

  let nextRow = row;
  nextRow = writeBreakdownTable(sheet, nextRow, "رزرو بر اساس روز", ["تاریخ", "تعداد", "نسبت"], summary.byDay);
  nextRow = writeBreakdownTable(sheet, nextRow, "رزرو بر اساس ساعت", ["ساعت", "تعداد", "نسبت"], summary.byHour);
  nextRow = writeBreakdownTable(sheet, nextRow, "رزرو بر اساس خدمت", ["خدمت", "تعداد", "نسبت"], summary.byService);
  writeBreakdownTable(sheet, nextRow, "رزرو بر اساس وضعیت", ["وضعیت", "تعداد", "نسبت"], summary.byStatus);

  applyLandscapeA4(sheet, context.generatedAtLabel);
}

/** Pure workbook builder — no I/O, fully unit-testable without a database. */
export function buildBookingReservationsWorkbook(
  rows: readonly BookingExportRow[],
  options?: { filtersDescription?: string; now?: Date },
): ExcelJS.Workbook {
  const now = options?.now ?? new Date();
  const summary = buildBookingExportSummary(rows, now);
  const filtersDescription = options?.filtersDescription ?? "بدون فیلتر (تمام رزروها)";
  const generatedAtLabel = formatJalaliDateTimeShort(now);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "StarOS";
  workbook.created = now;

  const mainSheet = workbook.addWorksheet("رزروها", {
    views: [{ rightToLeft: true }],
  });
  const headerRow = writeStatsDashboard(mainSheet, summary, {
    title: REPORT_TITLE,
    filtersDescription,
    generatedAtLabel,
    totalColumns: MAIN_COLUMN_COUNT,
  });
  // Freeze exactly through the table header row, whatever the dashboard's
  // final row count turns out to be — never a hardcoded, easily-stale number.
  mainSheet.views = [{ rightToLeft: true, state: "frozen", ySplit: headerRow }];
  // Must run before writeMainTable: applyLandscapeA4 assigns a brand-new
  // pageSetup object, which would otherwise wipe out the printTitlesRow it sets.
  applyLandscapeA4(mainSheet, generatedAtLabel);
  writeMainTable(mainSheet, headerRow, rows);

  const summarySheet = workbook.addWorksheet("خلاصه", {
    views: [{ rightToLeft: true }],
  });
  writeSummarySheet(summarySheet, summary, { title: REPORT_TITLE, filtersDescription, generatedAtLabel });

  return workbook;
}

export async function exportBookingReservationsXlsx(params: {
  organizationId: string;
  allowedBranchIds?: readonly string[] | null;
  filters: BookingReservationExportFilters;
}): Promise<ExportBookingReservationsXlsxResult> {
  try {
    const [rows, serviceTitle] = await Promise.all([
      loadBookingReservationsForExport({
        organizationId: params.organizationId,
        allowedBranchIds: params.allowedBranchIds,
        filters: params.filters,
      }),
      params.filters.serviceId
        ? loadBookingServiceTitleForExport({
            organizationId: params.organizationId,
            serviceId: params.filters.serviceId,
          })
        : Promise.resolve(null),
    ]);

    const filtersDescription = describeBookingReservationExportFilters(params.filters, {
      serviceTitle,
      statusLabel: params.filters.status
        ? BOOKING_EXPORT_STATUS_LABELS[params.filters.status]
        : null,
    });

    const workbook = buildBookingReservationsWorkbook(rows, { filtersDescription });
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
