"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function OrderOpsInstantSearch({
  value,
  hrefFor,
}: {
  value: string;
  hrefFor: (q: string) => string;
}) {
  const router = useRouter();
  const lastSent = useRef(value);
  const timerRef = useRef<number | null>(null);
  const [q, setQ] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [pending, startTransition] = useTransition();
  if (value !== prevValue) {
    setPrevValue(value);
    setQ(value);
  }

  function onChange(next: string) {
    setQ(next);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const trimmed = next.trim();
      if (trimmed === lastSent.current.trim()) return;
      lastSent.current = trimmed;
      startTransition(() => {
        router.replace(hrefFor(trimmed), { scroll: false });
      });
    }, 180);
  }

  return (
    <label className="relative block text-sm sm:col-span-2 xl:col-span-2">
      <span className="mb-1.5 block text-muted">جستجوی فوری</span>
      <input
        name="q"
        value={q}
        onChange={(event) => onChange(event.target.value)}
        placeholder="موبایل، دانش‌آموز، والد، سفارش، محصول، QR، کد ملی"
        autoComplete="off"
        className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5"
      />
      {pending ? (
        <span className="absolute start-3 top-[2.65rem] text-[10px] text-muted">در حال فیلتر…</span>
      ) : null}
    </label>
  );
}
