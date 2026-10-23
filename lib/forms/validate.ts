import { normalizeIranMobile, toEn } from "@/lib/format";
import { optionsOf, type FieldDef, type FormValue, type FormValues } from "./types";

export function isValidNationalCode(raw: string): boolean {
  const c = toEn(raw).replace(/\D/g, "");
  if (!/^\d{10}$/.test(c) || /^(\d)\1{9}$/.test(c)) return false;
  const sum = c.slice(0, 9).split("").reduce((a, d, i) => a + Number(d) * (10 - i), 0) % 11;
  const chk = Number(c[9]);
  return sum < 2 ? chk === sum : chk === 11 - sum;
}

/** Single-field check (used on blur and on submit). */
export function checkOne(f: FieldDef, v: FormValue | undefined): { error?: string; value?: FormValue } {
  if (empty(v)) return f.required && f.type !== "file" && f.type !== "section" ? { error: "این فیلد الزامی است." } : {};
  const str = Array.isArray(v) ? "" : String(v);
  switch (f.type) {
    case "phone": {
      const n = normalizeIranMobile(str);
      return n ? { value: n } : { error: "شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)." };
    }
    case "nationalCode": {
      const n = toEn(str).replace(/\D/g, "");
      return isValidNationalCode(n) ? { value: n } : { error: "کد ملی معتبر نیست؛ ۱۰ رقم را بدون خط تیره وارد کنید." };
    }
    case "email": {
      const n = toEn(str).trim().toLowerCase();
      return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(n) ? { value: n } : { error: "ایمیل معتبر نیست." };
    }
    case "number": {
      const n = toEn(str).trim();
      return /^-?\d+(\.\d+)?$/.test(n) ? { value: n } : { error: "لطفاً عدد وارد کنید." };
    }
    case "date":
      return /^\d{4}\/\d{2}\/\d{2}$/.test(toEn(str)) ? {} : { error: "تاریخ کامل نیست (روز، ماه و سال)." };
    case "select":
    case "radio":
    case "grade":
    case "major": {
      const opts = optionsOf(f);
      return opts.length && !opts.includes(str) ? { error: "گزینه نامعتبر است." } : {};
    }
    case "checkbox": {
      const opts = optionsOf(f).filter(Boolean);
      const arr = Array.isArray(v) ? v : [String(v)];
      return opts.length && arr.some((x) => !opts.includes(x)) ? { error: "گزینه نامعتبر است." } : {};
    }
    default:
      return str.length > 4000 ? { error: "متن بیش از حد طولانی است." } : {};
  }
}

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
    if (f.type === "section" || !isVisible(f, values)) {
      delete values[f.id];
      continue;
    }
    const r = checkOne(f, values[f.id]);
    if (r.error) errors[f.id] = r.error;
    else if (r.value !== undefined) values[f.id] = r.value;
  }
  return errors;
}

export function displayValue(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return v.join("، ");
  if (v === true || v === "on" || v === "true") return "بله";
  return String(v);
}
