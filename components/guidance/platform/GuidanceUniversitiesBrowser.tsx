"use client";

/**
 * Universities hub browser — client-side search/filter over the existing
 * Discover catalog (systems + program types). Presentation only; the data
 * arrives already projected from the server component.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { PortalIcon } from "@/components/portal/icons";
import { toPersianDigits } from "@/lib/persian";

export type UniversityEntry = {
  slug: string;
  title: string;
  kicker: string;
  lead: string;
  href: string;
  group: "SYSTEM" | "PROGRAM";
  groupLabel: string;
  terms: string;
};

const TABS = [
  { id: "ALL", label: "همه" },
  { id: "SYSTEM", label: "نظام‌های دانشگاهی" },
  { id: "PROGRAM", label: "انواع دوره" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function GuidanceUniversitiesBrowser({
  entries,
}: {
  entries: readonly UniversityEntry[];
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabId>("ALL");

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fa");
    return entries.filter((item) => {
      if (tab !== "ALL" && item.group !== tab) return false;
      if (!q) return true;
      return item.terms.includes(q) || item.title.includes(query.trim());
    });
  }, [entries, query, tab]);

  return (
    <div className="guidance-uni-browser">
      <div className="guidance-uni-browser__controls">
        <div className="guidance-uni-browser__search">
          <PortalIcon name="grid" className="size-4" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجو: روزانه، شبانه، پردیس، فرهنگیان…"
            aria-label="جستجو در نظام‌ها و دوره‌های دانشگاهی"
          />
          {query ? (
            <button
              type="button"
              className="guidance-uni-browser__clear"
              onClick={() => setQuery("")}
              aria-label="پاک کردن جستجو"
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="guidance-uni-browser__tabs" role="tablist">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? "is-active" : undefined}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className="guidance-uni-browser__count" role="status">
        {results.length > 0
          ? `${toPersianDigits(results.length)} مورد برای مطالعه`
          : "موردی با این جستجو پیدا نشد."}
      </p>

      {results.length === 0 ? (
        <div className="guidance-uni-browser__empty">
          <p>
            عبارت دیگری را امتحان کنید، یا مستقیم وارد دانشنامه کامل شوید.
          </p>
          <Link href="/discover/programs" className="guidance-uni-browser__empty-cta">
            دانشنامه انواع دوره‌ها
          </Link>
        </div>
      ) : (
        <ul className="guidance-uni-browser__grid">
          {results.map((item) => (
            <li key={`${item.group}-${item.slug}`}>
              <Link href={item.href} className="guidance-uni-card">
                <span className="guidance-uni-card__badge" data-group={item.group}>
                  {item.groupLabel}
                </span>
                <strong className="guidance-uni-card__title">{item.title}</strong>
                {item.kicker ? (
                  <span className="guidance-uni-card__kicker">{item.kicker}</span>
                ) : null}
                <em className="guidance-uni-card__lead">{item.lead}</em>
                <span className="guidance-uni-card__cta">
                  مطالعه کامل
                  <PortalIcon name="route" className="size-4" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
