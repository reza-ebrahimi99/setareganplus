"use client";
import { fromJalali, toJalali, J_MONTHS } from "@/lib/jalali";

const HM = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hour12: false });
const fa = (n: number) => n.toLocaleString("fa-IR", { useGrouping: false });

/** Jalali date + time picker (Tehran time). Value is an ISO string or null. */
export function JalaliDateTime({ value, onChange, label, hint, name }: { value: string | null; onChange: (v: string | null) => void; label: string; hint?: string; name: string }) {
  const d = value ? new Date(value) : null;
  const j = d ? toJalali(d) : null;
  const hm = d ? HM.format(d) : "09:00";
  const now = toJalali(new Date());
  const set = (p: Partial<{ jy: number; jm: number; jd: number; hm: string }>) => {
    const b = j ?? now;
    const n = { jy: b.jy, jm: b.jm, jd: b.jd, hm, ...p };
    const maxD = n.jm <= 6 ? 31 : n.jm < 12 ? 30 : 30;
    onChange(fromJalali(n.jy, n.jm, Math.min(n.jd, maxD), n.hm).toISOString());
  };
  const years = Array.from({ length: 4 }, (_, i) => now.jy - 1 + i);
  return (
    <div data-jdate={name}>
      <span className="label">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={!!d} onChange={(e) => (e.target.checked ? set({}) : onChange(null))} className="accent-navy" />فعال</label>
        {d && j && (
          <>
            <select aria-label="روز" value={j.jd} onChange={(e) => set({ jd: +e.target.value })} className="input w-auto py-1.5 text-sm">{Array.from({ length: j.jm <= 6 ? 31 : 30 }, (_, i) => <option key={i} value={i + 1}>{fa(i + 1)}</option>)}</select>
            <select aria-label="ماه" value={j.jm} onChange={(e) => set({ jm: +e.target.value })} className="input w-auto py-1.5 text-sm">{J_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
            <select aria-label="سال" value={j.jy} onChange={(e) => set({ jy: +e.target.value })} className="input w-auto py-1.5 text-sm">{years.map((y) => <option key={y} value={y}>{fa(y)}</option>)}</select>
            <input aria-label="ساعت" type="time" value={hm} onChange={(e) => set({ hm: e.target.value || "00:00" })} className="input w-auto py-1.5 text-sm" dir="ltr" />
          </>
        )}
      </div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </div>
  );
}
