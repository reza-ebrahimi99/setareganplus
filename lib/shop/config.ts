import { fa } from "@/lib/format";

export const GRADES = ["هفتم", "هشتم", "نهم", "دهم", "یازدهم", "دوازدهم", "فارغ‌التحصیل"] as const;
export const MAJORS = ["ریاضی", "تجربی", "انسانی", "هنر", "زبان", "فنی و کاردانش"] as const;
/** Majors only apply from grade 10 up */
export const gradeHasMajor = (g?: string | null) => !!g && ["دهم", "یازدهم", "دوازدهم", "فارغ‌التحصیل"].includes(g);

export const CENTERS: Record<string, string> = {
  ghalamchi: "قلم‌چی نسیم‌شهر",
  education: "آموزشگاه ستارگان",
};

export type BranchKey = "BOYS" | "GIRLS";
export const BRANCHES: Record<BranchKey, { name: string; short: string; address: string }> = {
  BOYS: { name: "شعبه پسران قلم‌چی نسیم‌شهر", short: "شعبه پسران", address: "نسیم‌شهر، بین کلانتری و بانک مسکن" },
  GIRLS: { name: "شعبه دختران قلم‌چی نسیم‌شهر", short: "شعبه دختران", address: "نسیم‌شهر، کوچه پاییزان" },
};
/** Legacy orders may still reference the elementary branch. */
export const BRANCH_LABEL: Record<string, string> = { BOYS: BRANCHES.BOYS.short, GIRLS: BRANCHES.GIRLS.short, ELEMENTARY: "دبستان (قدیمی)", UNKNOWN: "نامشخص" };
export const branchInfo = (k: string) => (BRANCHES as Record<string, { name: string; short: string; address: string }>)[k] ?? { name: BRANCH_LABEL[k] ?? k, short: BRANCH_LABEL[k] ?? k, address: "" };

export { PICKUP_HOURS } from "@/lib/hours";

export const STAGES = ["REGISTERED", "PAID", "IN_PRODUCTION", "READY", "DELIVERED"] as const;
export type Stage = (typeof STAGES)[number] | "CANCELLED";
export const STAGE: Record<Stage, { label: string; short: string; cls: string; dot: string }> = {
  REGISTERED: { label: "ثبت‌شده (در انتظار پرداخت)", short: "در انتظار پرداخت", cls: "bg-line text-muted", dot: "bg-muted" },
  PAID: { label: "پرداخت‌شده", short: "پرداخت‌شده", cls: "bg-gold/20 text-gold-ink", dot: "bg-gold" },
  IN_PRODUCTION: { label: "در حال چاپ", short: "در حال چاپ", cls: "bg-edu-soft text-edu", dot: "bg-edu" },
  READY: { label: "آماده تحویل", short: "آماده تحویل", cls: "bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  DELIVERED: { label: "تحویل داده شد", short: "تحویل‌شده", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  CANCELLED: { label: "لغوشده", short: "لغوشده", cls: "bg-gc-soft text-gc", dot: "bg-gc" },
};
export const PAY_METHOD: Record<string, string> = { ONLINE: "آنلاین (زیبال)", CASH: "نقدی", CARD: "کارتخوان", TRANSFER: "کارت‌به‌کارت", OTHER: "سایر" };

export const toman = (rials: number) => Math.round(rials / 10);
export const formatToman = (rials: number) => `${fa(toman(rials).toLocaleString("en-US")).replace(/,/g, "٬")} تومان`;
export const formatNum = (v: number) => fa(v.toLocaleString("en-US")).replace(/,/g, "٬");

/** Iranian national code (کد ملی) checksum. Accepts Persian digits. */
export { isValidNationalCode } from "@/lib/forms/validate";

export function siteUrl(): string {
  return (process.env.SITE_URL || "https://setareganplus.ir").replace(/\/+$/, "");
}
