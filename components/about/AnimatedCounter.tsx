"use client";

import { useEffect, useRef, useState } from "react";
import { toPersianDigits } from "@/lib/persian";

type AnimatedCounterProps = {
  value: number;
  suffix?: string;
  /** Display as year (no tween to avoid odd year animation) */
  isYear?: boolean;
  durationMs?: number;
  className?: string;
};

/**
 * Animated counter when scrolled into view.
 * Years snap in; other values ease from 0.
 */
export function AnimatedCounter({
  value,
  suffix = "",
  isYear = false,
  durationMs = 1400,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(isYear ? value : 0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(value);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [value]);

  useEffect(() => {
    if (!started) return;
    if (isYear) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, value, durationMs, isYear]);

  return (
    <span ref={ref} className={className}>
      {toPersianDigits(display)}
      {suffix ? toPersianDigits(suffix) : null}
    </span>
  );
}
