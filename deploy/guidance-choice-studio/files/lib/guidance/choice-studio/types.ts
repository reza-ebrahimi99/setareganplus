/**
 * Choice Studio — shared types. Client-safe (no ExcelJS / Prisma).
 */

export const CHOICE_STUDIO_BRAND = "تیم تخصصی انتخاب رشته مهندس رضا ابراهیمی";

export const CHOICE_STUDIO_TITLE = "استودیوی چیدمان انتخاب رشته";

export const INITIAL_NONFINAL_DISCLAIMER =
  "این چینش نسخه اولیه انتخاب رشته است و صرفاً جهت بررسی و اعلام نظر شما ارائه شده است. این نسخه به معنی ثبت نهایی در سامانه سازمان سنجش نیست.";

export const CHATGPT_PDF_PROMPT = `این فایل PDF انتخاب رشته را به یک فایل Excel استاندارد تبدیل کن.
هر انتخاب باید دقیقاً در یک ردیف قرار بگیرد.
ترتیب انتخاب‌ها را تغییر نده.
هیچ کد رشته‌ای را حدس نزن.
اگر اطلاعاتی در PDF وجود ندارد، آن را جعل نکن.
اعداد و کدهای رشته را دقیقاً از فایل استخراج و در قالب استاندارد زیر قرار بده:
اولویت
کد رشته
رشته
دانشگاه
شهر
دوره
توضیحات
برآورد شانس قبولی
یادداشت مشاور
در پایان فایل XLSX قابل دانلود تولید کن.`;

export const CANONICAL_SHEET_NAME = "انتخاب‌ها";
export const GUIDE_SHEET_NAME = "راهنما";

export const CANONICAL_COLUMNS = [
  "priority",
  "code",
  "major",
  "university",
  "city",
  "course",
  "description",
  "chance",
  "counselorNote",
] as const;

export type CanonicalColumn = (typeof CANONICAL_COLUMNS)[number];

export const CANONICAL_HEADER_LABELS: Record<CanonicalColumn, string> = {
  priority: "اولویت",
  code: "کد رشته",
  major: "رشته",
  university: "دانشگاه",
  city: "شهر",
  course: "دوره",
  description: "توضیحات",
  chance: "برآورد شانس قبولی",
  counselorNote: "یادداشت مشاور",
};

export const REQUIRED_COLUMNS: readonly CanonicalColumn[] = [
  "priority",
  "code",
  "major",
  "university",
  "course",
];

/** Sanjesh operational / publish limit. Draft preview may exceed this. */
export const SANJESH_ACTIVE_LIMIT = 150;

/** Parse + draft storage ceiling. Never silently truncate below this. */
export const CHOICE_STUDIO_MAX_PARSE_ROWS = 400;

export const CHOICE_STUDIO_MAX_FILE_BYTES = 4 * 1024 * 1024;

export const CHOICE_STUDIO_MAX_SHEETS = 8;

export const CHOICE_STUDIO_MAX_NOTE = 800;

export type ChoiceStudioIssueLevel = "error" | "warning";

export type ChoiceStudioIssue = {
  level: ChoiceStudioIssueLevel;
  code: string;
  message: string;
  rowNumber?: number;
};

export type CanonicalChoiceRow = {
  sourceRow: number;
  priority: number | null;
  priorityRaw: string;
  code: string;
  major: string;
  university: string;
  city: string;
  course: string;
  courseCode: string | null;
  description: string;
  chance: string | null;
  chanceRaw: string;
  counselorNote: string;
  formulaCell: boolean;
};

export type ChoiceImportPreview = {
  sheetName: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  activeSanjeshCount: number;
  exceedsSanjeshLimit: boolean;
  rows: CanonicalChoiceRow[];
  issues: ChoiceStudioIssue[];
  canCommit: boolean;
};

export type ChoiceDiffKind = "ADDED" | "REMOVED" | "MOVED" | "UNCHANGED" | "CHANGED";

export type ChoiceDiffRow = {
  kind: ChoiceDiffKind;
  code: string;
  major: string;
  university: string;
  fromPriority: number | null;
  toPriority: number | null;
  detail: string;
};

export type ChoiceDiffSummary = {
  added: number;
  removed: number;
  moved: number;
  changed: number;
  unchanged: number;
  rows: ChoiceDiffRow[];
};

export type ChoiceStudioProductState =
  | "EMPTY"
  | "DRAFT"
  | "INITIAL_READY"
  | "FINAL_DRAFT"
  | "FINAL_READY"
  | "FINAL_CONFIRMED"
  | "SANJESH_VERIFIED";
