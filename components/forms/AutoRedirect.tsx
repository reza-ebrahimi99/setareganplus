"use client";
import { useEffect, useState } from "react";

/** Counts down then follows the form's "after success" link. */
export function AutoRedirect({ href, seconds = 8, label = "ادامه" }: { href: string; seconds?: number; label?: string }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) {
      window.location.href = href;
      return;
    }
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left, href]);
  return (
    <a href={href} className="btn-gold px-6 py-2.5 text-sm print:hidden">
      {label} <span className="opacity-70">({left.toLocaleString("fa-IR")})</span>
    </a>
  );
}
