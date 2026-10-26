import { STAGE, STAGES, type Stage } from "./config";
import { fa } from "@/lib/format";

export const isStage = (v: string): v is Stage => v === "CANCELLED" || (STAGES as readonly string[]).includes(v);

export type Notice = { tone: "ok" | "warn" | "err"; text: string };

/** Query string after a stage change, read back by stageNotice(). */
export function stageQuery(r: { changed: number; same: number; failed: number }, stage: string, who?: string | null) {
  const u = new URLSearchParams({ ok: String(r.changed), st: stage });
  if (r.same) u.set("same", String(r.same));
  if (r.failed) u.set("fail", String(r.failed));
  if (who) u.set("who", who.slice(0, 60));
  u.set("t", Date.now().toString(36)); // new URL every time, so the banner is fresh even on repeat clicks
  return u.toString();
}

const ERR: Record<string, string> = {
  nosel: "هیچ سفارشی انتخاب نشده. اول تیک سفارش‌ها را بزنید، بعد «اعمال» را بزنید.",
  nostage: "وضعیت جدید را از فهرست «تغییر وضعیت به…» انتخاب کنید.",
  stage: "وضعیت انتخاب‌شده معتبر نیست. صفحه را دوباره باز کنید و دوباره امتحان کنید.",
  server: "خطایی پیش آمد و وضعیت ثبت نشد. چند لحظه بعد دوباره امتحان کنید؛ اگر باز هم نشد به مدیر خبر دهید.",
};

/** Persian banners for the orders list / detail / pickup pages. */
export function stageNotice(sp: { ok?: string; st?: string; same?: string; fail?: string; who?: string; err?: string }): Notice[] {
  const out: Notice[] = [];
  if (sp.err) out.push({ tone: "err", text: ERR[sp.err] ?? ERR.server });
  if (sp.ok === undefined) return out;
  const label = sp.st && isStage(sp.st) ? STAGE[sp.st].label : null;
  const n = Number(sp.ok) || 0, same = Number(sp.same) || 0, fail = Number(sp.fail) || 0;
  if (n) {
    const whom = n === 1 && sp.who ? `سفارش «${sp.who}»` : n === 1 ? "سفارش" : `${fa(n)} سفارش`;
    out.push({ tone: "ok", text: `✓ ${whom} ${label ? `به «${label}» تغییر کرد` : "به‌روزرسانی شد"}.${sp.st === "READY" ? " پیامک «آماده تحویل» برای خریدار فرستاده می‌شود." : ""}` });
  }
  if (same) out.push({ tone: "warn", text: `${same === 1 && !n ? "این سفارش" : `${fa(same)} سفارش`} از قبل ${label ? `در وضعیت «${label}»` : "در همین وضعیت"} بود؛ تغییری لازم نبود.` });
  if (fail) out.push({ tone: "err", text: `خطا: وضعیت ${fa(fail)} سفارش ثبت نشد. صفحه را دوباره باز کنید و دوباره امتحان کنید؛ اگر باز هم نشد به مدیر خبر دهید.` });
  if (!n && !same && !fail && !sp.err) out.push({ tone: "warn", text: "هیچ سفارشی تغییر نکرد." });
  return out;
}

export const NOTICE_CLS: Record<Notice["tone"], string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  err: "border-gc/30 bg-gc-soft text-gc",
};
