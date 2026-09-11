/**
 * Choice Studio normalization. Client-safe.
 * Does not guess academic codes or invent missing values.
 */

import { toLatinDigits } from "@/lib/forms/latin-digits";
import {
  GUIDANCE_EDUCATION_TYPES,
  type GuidanceEducationTypeCode,
} from "@/lib/guidance/journey/reference-data/education-types";
import type { CanonicalColumn } from "@/lib/guidance/choice-studio/types";

const ZW = /[\u200B-\u200D\uFEFF\u2060]/g;
const EXTRA_SPACE = /[\s\u00A0\u200C]+/g;

const HEADER_ALIASES: Record<CanonicalColumn, readonly string[]> = {
  priority: ["اولویت", "ردیف", "ترتیب", "شماره", "priority", "order", "row"],
  code: [
    "کد رشته",
    "کدرشته",
    "کد رشته محل",
    "کدرشته محل",
    "کد انتخاب",
    "کد رسمی",
    "code",
    "official code",
  ],
  major: ["رشته", "نام رشته", "رشته تحصیلی", "major", "field"],
  university: [
    "دانشگاه",
    "نام دانشگاه",
    "موسسه",
    "مؤسسه",
    "دانشگاه / موسسه",
    "دانشگاه / مؤسسه",
    "university",
    "institute",
  ],
  city: ["شهر", "محل", "شهرستان", "city"],
  course: ["دوره", "نوع دوره", "نوع پذیرش", "course", "type"],
  description: ["توضیحات", "شرایط", "توضیح", "description"],
  chance: [
    "شانس",
    "شانس قبولی",
    "احتمال قبولی",
    "برآورد شانس قبولی",
    "chance",
  ],
  counselorNote: [
    "یادداشت",
    "یادداشت مشاور",
    "توضیح مشاور",
    "counselor note",
    "note",
  ],
};

const CHANCE_ALIASES: Record<string, string> = {
  "خیلی کم": "very_low",
  "بسیار کم": "very_low",
  "خیلی ضعیف": "very_low",
  conservative: "very_low",
  کم: "low",
  ضعیف: "low",
  متوسط: "medium",
  متعادل: "medium",
  balanced: "medium",
  خوب: "good",
  likely: "good",
  "واقع بینانه": "good",
  "واقع‌بینانه": "good",
  "خیلی خوب": "very_good",
  "بسیار خوب": "very_good",
  optimistic: "very_good",
  "خوش بینانه": "very_good",
  "خوش‌بینانه": "very_good",
};

const FORBIDDEN_CHANCE = ["قطعی", "تضمینی", "صددرصد", "صد در صد", "۱۰۰٪", "100%"];

const COURSE_ALIASES: Array<{ needle: string; code: GuidanceEducationTypeCode }> = [
  { needle: "روزانه", code: "DAILY" },
  { needle: "daily", code: "DAILY" },
  { needle: "شبانه", code: "NIGHT" },
  { needle: "نوبت دوم", code: "NIGHT" },
  { needle: "night", code: "NIGHT" },
  { needle: "شهریه پرداز", code: "SELF_FUNDED" },
  { needle: "شهریه‌پرداز", code: "SELF_FUNDED" },
  { needle: "ظرفیت مازاد", code: "SELF_FUNDED" },
  { needle: "آزاد", code: "AZAD" },
  { needle: "azad", code: "AZAD" },
  { needle: "پیام نور", code: "PAYAM_NOOR" },
  { needle: "پیامنور", code: "PAYAM_NOOR" },
  { needle: "غیرانتفاعی", code: "NON_PROFIT" },
  { needle: "علمی کاربردی", code: "APPLIED_SCIENCE" },
  { needle: "علمی-کاربردی", code: "APPLIED_SCIENCE" },
  { needle: "مجازی", code: "VIRTUAL" },
  { needle: "پردیس", code: "INTERNATIONAL" },
  { needle: "بین المللی", code: "INTERNATIONAL" },
  { needle: "فرهنگیان", code: "TEACHER_TRAINING" },
  { needle: "تربیت معلم", code: "TEACHER_TRAINING" },
];

export function normalizePersianText(value: string): string {
  return value
    .replace(ZW, "")
    .replace(/ي/g, "ی")
    .replace(/ى/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ۀ/g, "ه")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .replace(/[‏‎]/g, "")
    .replace(EXTRA_SPACE, " ")
    .trim();
}

export function normalizeDigits(value: string): string {
  return toLatinDigits(normalizePersianText(value));
}

export function normalizeExcelHeader(value: string): string {
  return normalizeDigits(value)
    .replace(/[._\-–—:/\\|()[\]{}]/g, " ")
    .replace(EXTRA_SPACE, " ")
    .trim()
    .toLowerCase();
}

export function mapExcelHeader(value: string): CanonicalColumn | null {
  const key = normalizeExcelHeader(value);
  if (!key) return null;
  for (const [column, aliases] of Object.entries(HEADER_ALIASES) as Array<
    [CanonicalColumn, readonly string[]]
  >) {
    if (aliases.some((alias) => normalizeExcelHeader(alias) === key)) {
      return column;
    }
  }
  return null;
}

/**
 * Official choice codes stay literal. Digits and letters are kept.
 * Leading zeros are preserved.
 */
export function normalizeChoiceCode(value: string): string {
  const text = normalizeDigits(value).replace(/[^\dA-Za-z۰-۹]/g, "");
  return text.slice(0, 40);
}

export function normalizePriority(value: string): number | null {
  const digits = normalizeDigits(value).replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isInteger(n) || n < 1 || n > 9999) return null;
  return n;
}

export function normalizeChanceLabel(value: string): {
  id: string | null;
  forbidden: boolean;
  unknown: boolean;
} {
  const key = normalizePersianText(value).toLowerCase();
  if (!key) return { id: null, forbidden: false, unknown: false };
  if (FORBIDDEN_CHANCE.some((word) => key.includes(word))) {
    return { id: null, forbidden: true, unknown: false };
  }
  const compact = key.replace(EXTRA_SPACE, " ").trim();
  const aliases = Object.entries(CHANCE_ALIASES)
    .map(([alias, id]) => [normalizePersianText(alias).toLowerCase(), id] as const)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [alias, id] of aliases) {
    if (compact === alias || compact.replace(/\s/g, "") === alias.replace(/\s/g, "")) {
      return { id, forbidden: false, unknown: false };
    }
  }
  for (const [alias, id] of aliases) {
    if (alias.length >= 2 && compact.includes(alias)) {
      return { id, forbidden: false, unknown: false };
    }
  }
  return { id: null, forbidden: false, unknown: true };
}

export function normalizeCourse(value: string): {
  label: string;
  code: GuidanceEducationTypeCode | null;
} {
  const label = normalizePersianText(value).slice(0, 80);
  if (!label) return { label: "", code: null };
  const exact = GUIDANCE_EDUCATION_TYPES.find(
    (t) => t.code === label.toUpperCase() || normalizePersianText(t.label) === label,
  );
  if (exact) return { label: exact.label, code: exact.code };
  const folded = label.toLowerCase();
  const hit = COURSE_ALIASES.find((a) => folded.includes(a.needle));
  if (hit) {
    const type = GUIDANCE_EDUCATION_TYPES.find((t) => t.code === hit.code);
    return { label: type?.label ?? label, code: hit.code };
  }
  return { label, code: null };
}

export function sanitizeChoiceText(value: string, max: number): string {
  return normalizePersianText(value).slice(0, max);
}

export function excelSafeText(value: string): string {
  if (!value) return "";
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}
