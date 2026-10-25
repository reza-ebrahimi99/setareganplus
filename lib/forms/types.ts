export const FIELD_TYPES = [
  { type: "text", label: "متن کوتاه", group: "basic" },
  { type: "textarea", label: "متن بلند", group: "basic" },
  { type: "number", label: "عدد", group: "basic" },
  { type: "phone", label: "شماره موبایل", group: "person" },
  { type: "nationalCode", label: "کد ملی", group: "person" },
  { type: "email", label: "ایمیل", group: "person" },
  { type: "grade", label: "پایهٔ تحصیلی", group: "school" },
  { type: "major", label: "رشته", group: "school" },
  { type: "select", label: "لیست کشویی", group: "choice" },
  { type: "radio", label: "تک‌انتخابی", group: "choice" },
  { type: "checkbox", label: "چندانتخابی / تأیید", group: "choice" },
  { type: "consent", label: "تأیید قوانین", group: "choice" },
  { type: "date", label: "تاریخ شمسی", group: "other" },
  { type: "file", label: "فایل / عکس", group: "other" },
  { type: "section", label: "عنوان و توضیح", group: "layout" },
  { type: "image", label: "تصویر", group: "layout" },
  { type: "page", label: "مرحلهٔ جدید", group: "layout" },
] as const;

export const FIELD_GROUPS: Record<string, string> = { basic: "متنی", person: "اطلاعات فردی", school: "تحصیلی", choice: "گزینه‌ای", other: "سایر", layout: "چیدمان" };

/** Fixed option lists (kept in sync with the booklet shop). */
export const PRESET_OPTIONS: Partial<Record<string, readonly string[]>> = {
  grade: ["اول", "دوم", "سوم", "چهارم", "پنجم", "ششم", "هفتم", "هشتم", "نهم", "دهم", "یازدهم", "دوازدهم", "فارغ‌التحصیل"],
  major: ["ریاضی", "تجربی", "انسانی", "هنر", "زبان", "فنی و کاردانش"],
};

/** Options a field offers (its own, or a preset), for rendering, validation and conditions. */
export function optionsOf(f: Pick<FieldDef, "type" | "options">): string[] {
  const preset = PRESET_OPTIONS[f.type];
  if (preset) return f.options?.filter(Boolean).length ? f.options.filter(Boolean) : [...preset];
  return f.options ?? [];
}

export type FieldType = (typeof FIELD_TYPES)[number]["type"];

export type FieldDef = {
  id: string;
  type: FieldType;
  label: string;
  help?: string;
  placeholder?: string;
  required?: boolean;
  /** select / radio / checkbox */
  options?: string[];
  /** Show this field only when another field has a given value */
  showIf?: { field: string; equals: string } | null;
  /** Layout hint on desktop */
  half?: boolean;
  /** Price per option in rials (select / radio / checkbox / grade / major), used when the form is priced by option */
  prices?: Record<string, number>;
  /** image block: image URL */
  src?: string;
  /** consent: link to the full terms */
  href?: string;
};

export type FormValue = string | string[];
export type FormValues = Record<string, FormValue>;

export const OPTION_TYPES: FieldType[] = ["select", "radio", "checkbox"];
/** Types whose options can carry a price */
export const PRICE_TYPES: FieldType[] = ["select", "radio", "checkbox", "grade", "major"];
/** Display-only blocks (no value) */
export const LAYOUT_TYPES: FieldType[] = ["section", "image", "page"];
export const isInput = (f: Pick<FieldDef, "type">) => !LAYOUT_TYPES.includes(f.type);

export type Step = { title: string; help?: string; fields: FieldDef[] };
/** Split fields into steps at each "page" block. A form without page blocks is one step. */
export function splitSteps(fields: FieldDef[], firstTitle = "اطلاعات"): Step[] {
  const steps: Step[] = [];
  let cur: Step = { title: firstTitle, fields: [] };
  for (const f of fields) {
    if (f.type === "page") {
      if (cur.fields.length || steps.length) steps.push(cur);
      cur = { title: f.label || `مرحله ${steps.length + 1}`, help: f.help, fields: [] };
    } else cur.fields.push(f);
  }
  steps.push(cur);
  return steps.filter((s, i) => s.fields.length || i === 0);
}
/** Types that can drive a "show only when" condition */
export const CONDITION_TYPES: FieldType[] = ["select", "radio", "checkbox", "grade", "major"];

export function fieldTypeLabel(t: string): string {
  return FIELD_TYPES.find((f) => f.type === t)?.label ?? t;
}

export function parseFields(raw: unknown): FieldDef[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((f): f is FieldDef => !!f && typeof f === "object" && "id" in f && "type" in f);
}
