"use client";

import { useEffect, useState } from "react";
import { toPersianDigits } from "@/lib/persian";

function parseTarget(value: string | number): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

type AnimatedStatValueProps = {
  value: string | number;
  active: boolean;
  suffix?: string;
};

export function AnimatedStatValue({
  value,
  active,
  suffix = "",
}: AnimatedStatValueProps) {
  const target = parseTarget(value);
  const fallback = `${toPersianDigits(value)}${suffix}`;
  const [display, setDisplay] = useState(() =>
    target === null ? fallback : toPersianDigits(0) + suffix,
  );

  useEffect(() => {
    if (!active) return;

    if (target === null) {
      setDisplay(fallback);
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setDisplay(toPersianDigits(target) + suffix);
      return;
    }

    let frame = 0;
    const duration = 1200;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(toPersianDigits(Math.round(target * eased)) + suffix);
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [active, fallback, suffix, target]);

  return <span>{display}</span>;
}
