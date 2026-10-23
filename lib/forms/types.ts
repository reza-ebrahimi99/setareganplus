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
  { type: "date", label: "تاریخ شمسی", group: "other" },
  { type: "file", label: "بارگذاری فایل", group: "other" },
  { type: "section", label: "عنوان بخش", group: "other" },
] as const;

export const FIELD_GROUPS: Record<string, string> = { basic: "متنی", person: "اطلاعات فردی", school: "تحصیلی", choice: "گزینه‌ای", other: "سایر" };

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
};

export type FormValue = string | string[];
export type FormValues = Record<string, FormValue>;

export const OPTION_TYPES: FieldType[] = ["select", "radio", "checkbox"];
/** Types that can drive a "show only when" condition */
export const CONDITION_TYPES: FieldType[] = ["select", "radio", "checkbox", "grade", "major"];

export function fieldTypeLabel(t: string): string {
  return FIELD_TYPES.find((f) => f.type === t)?.label ?? t;
}

export function parseFields(raw: unknown): FieldDef[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((f): f is FieldDef => !!f && typeof f === "object" && "id" in f && "type" in f);
}
