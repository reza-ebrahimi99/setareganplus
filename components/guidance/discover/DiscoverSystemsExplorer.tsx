"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toPersianDigits } from "@/lib/persian";

type SystemCard = {
  slug: string;
  href: string;
  title: string;
  kicker: string;
  lead: string;
};

export function DiscoverSystemsExplorer({ systems }: { systems: readonly SystemCard[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return systems;
    return systems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.kicker.toLowerCase().includes(q) ||
        item.lead.toLowerCase().includes(q),
    );
  }, [systems, query]);

  return (
    <div className="discover-systems-explorer">
      <header className="discover-systems-explorer__hero">
        <h1>نظام‌های دانشگاهی</h1>
        <p className="discover-systems-explorer__lead">
          همان رشته، زندگی‌های متفاوت — روزانه، شبانه، پردیس، آزاد و سایر نظام‌ها را
          پیش از انتخاب نهایی بشناسید.
        </p>
        <p className="discover-systems-explorer__crosslink">
          <Link href="/discover/programs">مقاطع و دوره‌ها</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/discover/majors">دانشنامه رشته‌ها</Link>
        </p>
      </header>

      <div className="discover-systems-explorer__toolbar">
        <label className="discover-systems-explorer__search">
          <span className="sr-only">جستجوی نظام دانشگاهی</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="روزانه، آزاد، پیام‌نور..."
            autoComplete="off"
          />
        </label>
        <p className="discover-systems-explorer__count" aria-live="polite">
          {toPersianDigits(results.length)} نظام
        </p>
      </div>

      <ul className="discover-systems-explorer__grid">
        {results.map((item) => (
          <li key={item.slug}>
            <article className="discover-system-card">
              <span className="discover-system-card__kicker">{item.kicker}</span>
              <h2>{item.title}</h2>
              <p>{item.lead}</p>
              <Link href={item.href} className="discover-system-card__cta">
                مطالعه کامل
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
