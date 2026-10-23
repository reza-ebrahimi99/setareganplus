import { normalizeIranMobile, toEn } from "@/lib/format";
import type { FieldDef, FormValue, FormValues } from "./types";

export function isVisible(field: FieldDef, values: FormValues): boolean {
  if (!field.showIf?.field) return true;
  const v = values[field.showIf.field];
  if (Array.isArray(v)) return v.includes(field.showIf.equals);
  return (v ?? "") === field.showIf.equals;
}

function empty(v: FormValue | undefined): boolean {
  return v === undefined || (Array.isArray(v) ? v.length === 0 : v.trim() === "");
}

/** Returns { fieldId: errorMessage } — empty object when valid. Also normalizes values in place. */
export function validateValues(fields: FieldDef[], values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    if (!isVisible(f, values)) {
      delete values[f.id];
      continue;
    }
    const v = values[f.id];
    if (empty(v)) {
      if (f.required && f.type !== "file") errors[f.id] = "این فیلد الزامی است.";
      continue;
    }
    if (f.type === "phone") {
      const n = normalizeIranMobile(String(v));
      if (!n) errors[f.id] = "شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷).";
      else values[f.id] = n;
    } else if (f.type === "number") {
      const n = toEn(String(v)).trim();
      if (!/^-?\d+(\.\d+)?$/.test(n)) errors[f.id] = "لطفاً عدد وارد کنید.";
      else values[f.id] = n;
    } else if (f.type === "date") {
      if (!/^\d{4}\/\d{2}\/\d{2}$/.test(toEn(String(v)))) errors[f.id] = "تاریخ کامل نیست.";
    } else if ((f.type === "select" || f.type === "radio") && f.options?.length) {
      if (!f.options.includes(String(v))) errors[f.id] = "گزینه نامعتبر است.";
    } else if (f.type === "checkbox" && f.options?.length) {
      const arr = Array.isArray(v) ? v : [v];
      if (arr.some((x) => !f.options!.includes(x))) errors[f.id] = "گزینه نامعتبر است.";
    } else if (typeof v === "string" && v.length > 4000) {
      errors[f.id] = "متن بیش از حد طولانی است.";
    }
  }
  return errors;
}

export function displayValue(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return v.join("، ");
  if (v === true || v === "on" || v === "true") return "بله";
  return String(v);
}
