"use client";

import { useEffect, useState } from "react";
import { toPersianDigits } from "@/lib/persian";

type DiscountCountdownProps = {
  endsAtIso: string | null;
  enabled: boolean;
  onExpired?: () => void;
  compact?: boolean;
};

type Remaining = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function computeRemaining(endsAtMs: number, nowMs: number): Remaining {
  const totalMs = Math.max(0, endsAtMs - nowMs);
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return { totalMs, days, hours, minutes, seconds };
}

export function DiscountCountdown({
  endsAtIso,
  enabled,
  onExpired,
  compact = false,
}: DiscountCountdownProps) {
  const [mounted, setMounted] = useState(false);
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!enabled || !endsAtIso) {
      setRemaining(null);
      setExpired(false);
      return;
    }

    const endsAtMs = Date.parse(endsAtIso);
    if (Number.isNaN(endsAtMs)) {
      setRemaining(null);
      return;
    }

    let cancelled = false;
    let notified = false;

    function tick() {
      if (cancelled) return;
      const next = computeRemaining(endsAtMs, Date.now());
      setRemaining(next);
      if (next.totalMs <= 0) {
        setExpired(true);
        if (!notified) {
          notified = true;
          onExpired?.();
        }
      } else {
        setExpired(false);
      }
    }

    tick();
    const id = window.setInterval(tick, 1000);

    function onVisibility() {
      if (document.visibilityState === "visible") {
        tick();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, endsAtIso, onExpired]);

  if (!enabled || !endsAtIso) {
    return null;
  }

  if (!mounted) {
    return (
      <div
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        aria-hidden="true"
      >
        <span className="inline-flex items-center gap-2 font-medium">
          <span aria-hidden="true">⏳</span>
          در حال آماده‌سازی شمارش معکوس…
        </span>
      </div>
    );
  }

  if (expired || (remaining && remaining.totalMs <= 0)) {
    return (
      <div
        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
        role="status"
      >
        <span className="inline-flex items-center gap-2 font-medium">
          <span aria-hidden="true">❌</span>
          تخفیف به پایان رسید.
        </span>
      </div>
    );
  }

  if (!remaining) return null;

  if (compact) {
    return (
      <div
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="timer"
        aria-live="polite"
      >
        <span className="inline-flex flex-wrap items-center gap-2 font-medium">
          <span aria-hidden="true">⏳</span>
          {toPersianDigits(remaining.days)} روز و{" "}
          {toPersianDigits(remaining.hours)} ساعت
        </span>
      </div>
    );
  }

  const cells = [
    { label: "روز", value: remaining.days },
    { label: "ساعت", value: remaining.hours },
    { label: "دقیقه", value: remaining.minutes },
    { label: "ثانیه", value: remaining.seconds },
  ];

  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950"
      role="timer"
      aria-live="polite"
    >
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold">
        <span aria-hidden="true">⏳</span>
        پایان تخفیف
      </p>
      <div className="grid grid-cols-4 gap-2">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="rounded-xl bg-white/80 px-2 py-2 text-center shadow-sm"
          >
            <p className="text-lg font-bold tabular-nums sm:text-xl">
              {toPersianDigits(String(cell.value).padStart(2, "0"))}
            </p>
            <p className="mt-0.5 text-[10px] text-amber-800/80">{cell.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
