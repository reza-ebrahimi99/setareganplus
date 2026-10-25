// Pure display helpers for form cards / hero (client-safe).
import { optionsOf, PRICE_TYPES } from "./types";
import { tomanText } from "./pricing";
import type { PublicForm } from "./public-types";
import { fa } from "@/lib/format";

/** "رایگان" / "۱۲۰٬۰۰۰ تومان" / "از ۸۰٬۰۰۰ تومان" */
export function priceBadge(f: Pick<PublicForm, "payMode" | "basePriceRials" | "fields">): { text: string; free: boolean } {
  const base = f.basePriceRials ?? 0;
  if (f.payMode === "FIXED") return base > 0 ? { text: tomanText(base), free: false } : { text: "رایگان", free: true };
  if (f.payMode !== "OPTIONS") return { text: "رایگان", free: true };
  let min = base;
  let varies = false;
  for (const fd of f.fields) {
    if (!PRICE_TYPES.includes(fd.type) || !fd.prices) continue;
    const ps = optionsOf(fd).filter(Boolean).map((o) => Math.max(0, fd.prices?.[o] ?? 0));
    if (ps.some((p) => p > 0)) varies = true;
    if (fd.required && !fd.showIf && fd.type !== "checkbox" && ps.length) min += Math.min(...ps);
  }
  if (!varies) return base > 0 ? { text: tomanText(base), free: false } : { text: "رایگان", free: true };
  return min > 0 ? { text: `از ${tomanText(min)}`, free: false } : { text: "بسته به انتخاب", free: false };
}

export function capacityBadge(f: Pick<PublicForm, "state" | "remaining" | "capacity">): string | null {
  if (f.state === "full") return "ظرفیت تکمیل";
  if (f.remaining == null || f.capacity == null) return null;
  return f.remaining <= Math.max(5, Math.ceil(f.capacity * 0.2)) ? `فقط ${fa(f.remaining)} جای خالی` : `${fa(f.remaining)} جای خالی`;
}

const DAY = 864e5;
export function deadlineBadge(f: Pick<PublicForm, "state" | "closesAt" | "opensAt">): string | null {
  if (f.state === "soon" && f.opensAt) return "به‌زودی";
  if (f.state === "closed") return "پایان‌یافته";
  if (!f.closesAt) return null;
  const left = new Date(f.closesAt).getTime() - Date.now();
  if (left <= 0) return "پایان‌یافته";
  if (left < DAY) return "آخرین روز ثبت‌نام";
  const d = Math.ceil(left / DAY);
  return d <= 14 ? `${fa(d)} روز تا پایان ثبت‌نام` : null;
}
