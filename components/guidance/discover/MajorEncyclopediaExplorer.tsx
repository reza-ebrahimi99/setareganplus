"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  filterMajorExplorerCards,
  MAJOR_EXAM_FILTER_LABELS,
  type MajorExplorerCard,
} from "@/lib/guidance/discover/major-catalog-ui";
import { DISCOVER_EXAM_GROUPS } from "@/lib/guidance/discover/catalog";
import { toPersianDigits } from "@/lib/persian";
import type { GuidanceExamGroup } from "@/lib/guidance/types";

type FilterKey = GuidanceExamGroup | "ALL";

const FILTER_OPTIONS: readonly { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "همه رشته‌ها" },
  ...DISCOVER_EXAM_GROUPS.map((group) => ({
    key: group,
    label: MAJOR_EXAM_FILTER_LABELS[group],
  })),
];

export function MajorEncyclopediaExplorer({
  cards,
  totalCount,
}: {
  cards: readonly MajorExplorerCard[];
  totalCount: number;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("ALL");

  const results = useMemo(
    () => filterMajorExplorerCards(cards, query, filter),
    [cards, query, filter],
  );

  return (
    <div className="major-encyclopedia-explorer">
      <header className="major-encyclopedia-explorer__hero">
        <h1>دانشنامه رشته‌های دانشگاهی</h1>
        <p className="major-encyclopedia-explorer__lead">
          قبل از قفل کردن فهرست ۱۵۰، {toPersianDigits(totalCount)} رشته را در پنج گروه آزمایشی
          بشناسید — درس، روحیه، بازار کار و خطاهای رایج، نه قول قبولی.
        </p>
      </header>

      <p className="major-encyclopedia-explorer__crosslink">
        <Link href="/discover/systems">نظام‌های دانشگاهی</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/discover/programs">مقاطع و دوره‌ها</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/discover">کانون کشف</Link>
      </p>

      <div className="major-encyclopedia-explorer__toolbar">
        <label className="major-encyclopedia-explorer__search">
          <span className="sr-only">جستجوی رشته</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="نام رشته را جستجو کنید..."
            autoComplete="off"
          />
        </label>

        <div className="major-encyclopedia-explorer__filters" role="group" aria-label="فیلتر گروه آزمایشی">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={filter === option.key ? "is-active" : undefined}
              aria-pressed={filter === option.key}
              onClick={() => setFilter(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="major-encyclopedia-explorer__count" aria-live="polite">
          {toPersianDigits(results.length)} نتیجه
          {filter !== "ALL" ? ` در گروه ${MAJOR_EXAM_FILTER_LABELS[filter as GuidanceExamGroup]}` : ""}
          {query.trim() ? ` برای «${query.trim()}»` : ""}
        </p>
      </div>

      {results.length === 0 ? (
        <div className="major-encyclopedia-explorer__empty">
          <p>رشته‌ای با این فیلتر پیدا نشد.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("ALL");
            }}
          >
            نمایش همه رشته‌ها
          </button>
        </div>
      ) : (
        <ul className="major-encyclopedia-explorer__grid">
          {results.map((item) => (
            <li key={item.slug}>
              <article className="major-encyclopedia-card">
                <div className="major-encyclopedia-card__head">
                  <span className={`major-encyclopedia-card__group major-encyclopedia-card__group--${item.examGroup.toLowerCase()}`}>
                    {item.examGroupLabel}
                  </span>
                  <p className="major-encyclopedia-card__kicker">{item.kicker}</p>
                </div>
                <h2>{item.title}</h2>
                <p className="major-encyclopedia-card__lead">{item.lead}</p>
                <p className="major-encyclopedia-card__suitable">
                  <strong>مناسب برای:</strong> {item.suitableFor}
                </p>
                <Link href={item.href} className="major-encyclopedia-card__cta">
                  معرفی کامل رشته
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
