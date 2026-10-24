"use client";
import { useEffect, useRef, useState } from "react";

const FA = "۰۱۲۳۴۵۶۷۸۹";
const toFa = (s: string) => s.replace(/[0-9]/g, (d) => FA[Number(d)]);
const toEn = (s: string) => s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)));

/** Counts up to a numeric value once visible. Renders the final value on the server (no-JS safe). */
export function CountUp({ value, className = "" }: { value: string; className?: string }) {
  const en = toEn(value);
  const m = en.match(/^(\D*)(\d+)(\D*)$/);
  const target = m ? Number(m[2]) : NaN;
  const [shown, setShown] = useState(toFa(en));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!m || !Number.isFinite(target) || !ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const dur = 1400;
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - k, 3);
        setShown(toFa(`${m[1]}${Math.round(target * eased)}${m[3]}`));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [en]);

  return <span ref={ref} className={className}>{shown}</span>;
}
