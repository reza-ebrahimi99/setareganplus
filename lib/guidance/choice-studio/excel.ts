/**
 * Server-only Choice Studio XLSX parse / template / export.
 * Reuses exceljs. Never executes formulas or macros.
 */

import ExcelJS from "exceljs";
import {
  CANONICAL_COLUMNS,
  CANONICAL_HEADER_LABELS,
  CANONICAL_SHEET_NAME,
  CHOICE_STUDIO_BRAND,
  CHOICE_STUDIO_MAX_FILE_BYTES,
  CHOICE_STUDIO_MAX_PARSE_ROWS,
  CHOICE_STUDIO_MAX_SHEETS,
  GUIDE_SHEET_NAME,
  SANJESH_ACTIVE_LIMIT,
  type CanonicalChoiceRow,
  type CanonicalColumn,
  type ChoiceImportPreview,
} from "@/lib/guidance/choice-studio/types";
import {
  excelSafeText,
  mapExcelHeader,
  normalizeChanceLabel,
  normalizeChoiceCode,
  normalizeCourse,
  normalizePriority,
  sanitizeChoiceText,
} from "@/lib/guidance/choice-studio/normalize";
import {
  missingRequiredHeaders,
  validateCanonicalRows,
} from "@/lib/guidance/choice-studio/validate";
import { labelChoiceBand } from "@/lib/guidance/journey-v2/labels";
import type { ChoiceItemInput, ChoiceItemView } from "@/lib/guidance/journey-v2/choices";

const NAVY = "FF0F2744";
const GOLD = "FFC9A227";
const CREAM = "FFF7F1DE";

function extensionOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function cellText(cell: ExcelJS.Cell): { text: string; formula: boolean } {
  const formula =
    cell.type === ExcelJS.ValueType.Formula ||
    (typeof cell.value === "object" && cell.value !== null && "formula" in cell.value);
  const raw = String(cell.text ?? "").replace(/\u0000/g, "").trim();
  return { text: raw.slice(0, 2000), formula };
}

function isBlankRow(texts: string[]): boolean {
  return texts.every((t) => !t.trim());
}

export async function parseChoiceWorkbook(file: File): Promise<ChoiceImportPreview> {
  if (!file || file.size <= 0) {
    throw new Error("فایل خالی است. یک فایل XLSX معتبر انتخاب کنید.");
  }
  if (file.size > CHOICE_STUDIO_MAX_FILE_BYTES) {
    throw new Error("حجم فایل نباید بیشتر از ۴ مگابایت باشد.");
  }

  const ext = extensionOf(file.name);
  if (ext === ".xls") {
    throw new Error("فایل‌های قدیمی XLS پشتیبانی نمی‌شوند. فایل را به‌صورت XLSX ذخیره کنید.");
  }
  if (ext === ".xlsm" || ext === ".xlsb") {
    throw new Error("فایل اکسل ماکرو‌دار پذیرفته نمی‌شود. یک XLSX بدون ماکرو بارگذاری کنید.");
  }
  if (ext !== ".xlsx") {
    throw new Error("فقط فایل XLSX پذیرفته می‌شود.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error("محتوای فایل XLSX معتبر نیست یا فایل رمزگذاری شده است.");
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as never);
  } catch {
    throw new Error("خواندن فایل اکسل ممکن نشد. فایل خراب یا رمزدار است.");
  }

  if (workbook.worksheets.length === 0) {
    throw new Error("فایل هیچ شیتی ندارد.");
  }
  if (workbook.worksheets.length > CHOICE_STUDIO_MAX_SHEETS) {
    throw new Error("تعداد شیت‌ها بیش از حد مجاز است.");
  }

  const sheet = pickChoiceSheet(workbook);
  return parseChoiceWorksheet(sheet);
}

function pickChoiceSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const named = workbook.worksheets.find(
    (s) => sanitizeChoiceText(s.name, 40) === CANONICAL_SHEET_NAME,
  );
  if (named) return named;

  const candidates = workbook.worksheets.filter((sheet) => {
    if (sanitizeChoiceText(sheet.name, 40) === GUIDE_SHEET_NAME) return false;
    const mapped = detectHeaders(sheet);
    return mapped != null && missingRequiredHeaders(mapped.mapped).length === 0;
  });

  if (candidates.length === 1) return candidates[0]!;
  if (candidates.length === 0) {
    throw new Error(
      `شیت «${CANONICAL_SHEET_NAME}» یافت نشد و هیچ شیت دیگری با ستون‌های استاندارد تشخیص داده نشد.`,
    );
  }
  throw new Error(
    "چند شیت با ستون‌های انتخاب رشته پیدا شد. شیت مورد نظر را «انتخاب‌ها» نام‌گذاری کنید.",
  );
}

function detectHeaders(sheet: ExcelJS.Worksheet): {
  headerRow: number;
  mapped: Partial<Record<CanonicalColumn, number>>;
} | null {
  let best: { headerRow: number; mapped: Partial<Record<CanonicalColumn, number>>; score: number } | null =
    null;
  const maxScan = Math.min(sheet.rowCount || 0, 20);
  for (let r = 1; r <= maxScan; r += 1) {
    const row = sheet.getRow(r);
    const mapped: Partial<Record<CanonicalColumn, number>> = {};
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const column = mapExcelHeader(cellText(cell).text);
      if (column && mapped[column] == null) mapped[column] = col;
    });
    const score = Object.keys(mapped).length;
    if (score >= 3 && (!best || score > best.score)) {
      best = { headerRow: r, mapped, score };
    }
  }
  return best;
}

function parseChoiceWorksheet(sheet: ExcelJS.Worksheet): ChoiceImportPreview {
  const detected = detectHeaders(sheet);
  if (!detected) {
    throw new Error("ردیف عنوان استاندارد پیدا نشد. از قالب رسمی استودیو استفاده کنید.");
  }
  const missing = missingRequiredHeaders(detected.mapped);
  if (missing.length > 0) {
    const labels = missing.map((col) => CANONICAL_HEADER_LABELS[col]).join("، ");
    throw new Error(`ستون‌های الزامی ناقص است: ${labels}`);
  }

  const rows: CanonicalChoiceRow[] = [];
  let scanned = 0;
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= detected.headerRow) return;
    scanned += 1;
    if (scanned > CHOICE_STUDIO_MAX_PARSE_ROWS) return;
    const texts: string[] = [];
    const formulaFlags: boolean[] = [];
    const read = (col: CanonicalColumn | undefined) => {
      if (!col) return { text: "", formula: false };
      const index = detected.mapped[col];
      if (!index) return { text: "", formula: false };
      const cell = row.getCell(index);
      const value = cellText(cell);
      texts.push(value.text);
      formulaFlags.push(value.formula);
      return value;
    };

    const priorityRaw = read("priority").text;
    const codeRaw = read("code");
    const majorRaw = read("major").text;
    const universityRaw = read("university").text;
    const cityRaw = read("city").text;
    const courseRaw = read("course").text;
    const descriptionRaw = read("description").text;
    const chanceRaw = read("chance").text;
    const noteRaw = read("counselorNote").text;

    if (isBlankRow([priorityRaw, codeRaw.text, majorRaw, universityRaw, courseRaw])) {
      return;
    }

    const course = normalizeCourse(courseRaw);
    const chance = normalizeChanceLabel(chanceRaw);
    rows.push({
      sourceRow: rowNumber,
      priority: normalizePriority(priorityRaw),
      priorityRaw,
      code: normalizeChoiceCode(codeRaw.text),
      major: sanitizeChoiceText(majorRaw, 160),
      university: sanitizeChoiceText(universityRaw, 160),
      city: sanitizeChoiceText(cityRaw, 80),
      course: course.label,
      courseCode: course.code,
      description: sanitizeChoiceText(descriptionRaw, 800),
      chance: chance.forbidden || chance.unknown ? null : chance.id,
      chanceRaw,
      counselorNote: sanitizeChoiceText(noteRaw, 800),
      formulaCell: formulaFlags.some(Boolean),
    });
  });

  if (scanned > CHOICE_STUDIO_MAX_PARSE_ROWS) {
    throw new Error(
      `تعداد ردیف‌ها از سقف ایمنی ${CHOICE_STUDIO_MAX_PARSE_ROWS} بیشتر است. فایل را کوچک‌تر کنید.`,
    );
  }
  if (rows.length === 0) {
    throw new Error("هیچ ردیف انتخابی در فایل پیدا نشد.");
  }

  return validateCanonicalRows(rows, sheet.name);
}

export function previewRowsToInputs(rows: CanonicalChoiceRow[]): ChoiceItemInput[] {
  const ordered = [...rows].sort((a, b) => {
    const pa = a.priority ?? a.sourceRow;
    const pb = b.priority ?? b.sourceRow;
    if (pa !== pb) return pa - pb;
    return a.sourceRow - b.sourceRow;
  });
  return ordered.map((row) => ({
    major: row.major,
    university: row.university,
    city: row.city,
    educationType: row.courseCode ?? row.course,
    officialCode: row.code || null,
    band: row.chance,
    notes: row.description || null,
    rationale: row.counselorNote || null,
    isActive: true,
  }));
}

export function buildChoiceTemplateWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = CHOICE_STUDIO_BRAND;
  workbook.views = [{ x: 0, y: 0, width: 12000, height: 8000, firstSheet: 0, activeTab: 0, visibility: "visible" }];

  const sheet = workbook.addWorksheet(CANONICAL_SHEET_NAME, {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  sheet.properties.defaultRowHeight = 22;
  const headers = CANONICAL_COLUMNS.map((col) => CANONICAL_HEADER_LABELS[col]);
  const header = sheet.addRow(headers);
  header.height = 28;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Vazirmatn" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    cell.border = {
      bottom: { style: "thin", color: { argb: GOLD } },
    };
  });
  const widths = [10, 16, 28, 32, 14, 18, 28, 18, 28];
  widths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };
  sheet.getColumn(2).numFmt = "@";

  const guide = workbook.addWorksheet(GUIDE_SHEET_NAME, {
    views: [{ rightToLeft: true }],
  });
  guide.getColumn(1).width = 88;
  const lines = [
    CHOICE_STUDIO_BRAND,
    "قالب رسمی اکسل استودیوی چیدمان انتخاب رشته",
    "",
    "ستون‌های الزامی: اولویت، کد رشته، رشته، دانشگاه، دوره",
    "ستون‌های اختیاری: شهر، توضیحات، برآورد شانس قبولی، یادداشت مشاور",
    "",
    "برچسب‌های مجاز شانس قبولی: خیلی کم / کم / متوسط / خوب / خیلی خوب",
    "از واژه‌های قطعی، تضمینی یا صددرصد استفاده نکنید.",
    "",
    `سقف انتخاب فعال برای ثبت سنجش: ${SANJESH_ACTIVE_LIMIT} ردیف`,
    "اگر سند خارجی بیش از این تعداد ردیف دارد، همه ردیف‌ها پیش‌نمایش می‌شوند اما قبل از انتشار باید فهرست فعال به سقف برسد.",
    "",
    "کد رشته را حدس نزنید. اگر کد در منبع نیست، آن خانه را خالی نگذارید مگر اینکه بعداً در استودیو اصلاح شود.",
    "ترتیب ردیف‌ها همان ترتیب اولویت است. استودیو ردیف‌ها را الفبایی مرتب نمی‌کند.",
    "",
    "گردش کار پیشنهادی: PDF خارجی → ChatGPT → این قالب XLSX → بارگذاری در استودیو → پیش‌نمایش → انتشار.",
    "تبدیل ChatGPT خطاناپذیر نیست. همیشه پیش‌نمایش را قبل از ذخیره بررسی کنید.",
  ];
  lines.forEach((line, index) => {
    const row = guide.addRow([line]);
    row.font = { name: "Vazirmatn", bold: index === 0, size: index === 0 ? 14 : 11 };
    row.alignment = { readingOrder: "rtl", wrapText: true };
    if (index === 0) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM } };
    }
  });

  return workbook;
}

export function buildChoiceExportWorkbook(params: {
  title: string;
  studentName: string;
  items: ChoiceItemView[];
}): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = CHOICE_STUDIO_BRAND;
  const sheet = workbook.addWorksheet(CANONICAL_SHEET_NAME, {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  const headers = CANONICAL_COLUMNS.map((col) => CANONICAL_HEADER_LABELS[col]);
  const header = sheet.addRow(headers);
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { horizontal: "center", readingOrder: "rtl" };
  });
  [10, 16, 28, 32, 14, 18, 28, 18, 28].forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };
  sheet.getColumn(2).numFmt = "@";

  const active = params.items.filter((i) => i.isActive);
  for (const item of active) {
    const row = sheet.addRow([
      item.sortOrder,
      excelSafeText(item.officialCode ?? ""),
      excelSafeText(item.major),
      excelSafeText(item.university),
      excelSafeText(item.city),
      excelSafeText(item.educationTypeLabel === "—" ? item.educationType : item.educationTypeLabel),
      excelSafeText(item.notes),
      excelSafeText(item.band ? labelChoiceBand(item.band) : ""),
      excelSafeText(item.rationale),
    ]);
    row.getCell(2).numFmt = "@";
    row.alignment = { readingOrder: "rtl", wrapText: true };
  }

  const guide = workbook.addWorksheet(GUIDE_SHEET_NAME, {
    views: [{ rightToLeft: true }],
  });
  guide.getColumn(1).width = 80;
  guide.addRow([CHOICE_STUDIO_BRAND]);
  guide.addRow([params.title]);
  guide.addRow([`دانش‌آموز: ${params.studentName}`]);
  guide.addRow(["این فایل همان قالب استاندارد ورود/خروج استودیو است. ترتیب را حفظ کنید."]);
  return workbook;
}

export async function workbookToBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}
