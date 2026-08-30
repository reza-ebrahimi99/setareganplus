/**
 * Book Commerce ERP — Pen Book Agency.
 * Phase A (Foundation) + Phase B (Catalog) constants only.
 * Do not add warehouse/sales/procurement/treasury/marketing/commission
 * constants here until those phases are approved.
 */

export const BOOKS_FEATURE_FLAG_KEY = "bookCommerce";

export const BOOKS_HARD_OFF_ENV = "STAROS_BOOKS_ERP_HARD_OFF";

export const BOOKS_CATALOG_PAGE_SIZE = 24;

export const BOOKS_IMPORT_MAX_BYTES = 8 * 1024 * 1024;

export const BOOKS_IMPORT_MAX_ROWS = 5_000;

export const BOOKS_IMPORT_MAX_COLUMNS = 40;

export const BOOKS_IMPORT_PREVIEW_ROWS = 20;

export const BOOKS_IMPORT_CHUNK_SIZE = 200;

/** Seeded starter taxonomy. Admin-manageable afterwards — never a hardcoded enum. */
export const DEFAULT_BOOK_TYPES: ReadonlyArray<{
  code: string;
  label: string;
  sortOrder: number;
}> = [
  { code: "NORMAL", label: "عادی", sortOrder: 10 },
  { code: "BLUE", label: "آبی", sortOrder: 20 },
  { code: "GREEN", label: "سبز", sortOrder: 30 },
  { code: "PURPLE", label: "بنفش", sortOrder: 40 },
  { code: "ORANGE", label: "نارنجی", sortOrder: 50 },
  { code: "SUMMER", label: "تابستان", sortOrder: 60 },
  { code: "GIFT", label: "هدیه", sortOrder: 70 },
  { code: "COLLECTION", label: "مجموعه", sortOrder: 80 },
  { code: "MAGAZINE", label: "مجله", sortOrder: 90 },
  { code: "EXAM", label: "آزمون", sortOrder: 100 },
  { code: "BOOKLET", label: "جزوه", sortOrder: 110 },
  { code: "EDUCATIONAL_PACKAGE", label: "بسته آموزشی", sortOrder: 120 },
  { code: "SCHOOL_PACKAGE", label: "بسته مدرسه", sortOrder: 130 },
  { code: "SPECIAL_EDITION", label: "ویژه", sortOrder: 140 },
];

export const BOOKS_DOCUMENT_SEQUENCE_PAD = 6;
