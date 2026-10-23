"use client";
import { useTransition } from "react";

const OPTS = [
  ["NEW", "جدید", "bg-gold/20 text-gold-ink"],
  ["CONTACTED", "تماس گرفته شد", "bg-edu-soft text-edu"],
  ["ENROLLED", "ثبت‌نام شد", "bg-emerald-50 text-emerald-700"],
  ["ARCHIVED", "بایگانی", "bg-line text-muted"],
] as const;

export function StatusSelect({ id, value, action }: { id: string; value: string; action: (id: string, status: string) => Promise<void> }) {
  const [pending, start] = useTransition();
  const cls = OPTS.find((o) => o[0] === value)?.[2] ?? "";
  return (
    <select
      defaultValue={value}
      disabled={pending}
      onChange={(e) => start(() => action(id, e.target.value))}
      className={`cursor-pointer rounded-full border-0 py-1 pr-2.5 pl-6 text-xs font-bold ${cls} disabled:opacity-50`}
      aria-label="وضعیت"
    >
      {OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
