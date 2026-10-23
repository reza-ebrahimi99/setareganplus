export const FIELD_TYPES = [
  { type: "text", label: "متن کوتاه" },
  { type: "phone", label: "شماره موبایل" },
  { type: "number", label: "عدد" },
  { type: "select", label: "لیست کشویی" },
  { type: "radio", label: "تک‌انتخابی" },
  { type: "checkbox", label: "چندانتخابی / تأیید" },
  { type: "date", label: "تاریخ شمسی" },
  { type: "textarea", label: "متن بلند" },
  { type: "file", label: "بارگذاری فایل" },
] as const;

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

export function fieldTypeLabel(t: string): string {
  return FIELD_TYPES.find((f) => f.type === t)?.label ?? t;
}

export function parseFields(raw: unknown): FieldDef[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((f): f is FieldDef => !!f && typeof f === "object" && "id" in f && "type" in f);
}
