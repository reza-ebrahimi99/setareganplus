"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  filterProgramExplorerCards,
  PROGRAM_CATEGORY_LABELS,
  PROGRAM_CATEGORY_ORDER,
  toProgramExplorerCard,
  type ProgramExplorerCard,
} from "@/lib/guidance/discover/program-catalog-ui";
import type { DiscoverProgram, DiscoverProgramCategory } from "@/lib/guidance/discover/types";
import { toPersianDigits } from "@/lib/persian";

type FilterKey = DiscoverProgramCategory | "ALL";

const FILTER_OPTIONS: readonly { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "همه موارد" },
  ...PROGRAM_CATEGORY_ORDER.map((category) => ({
    key: category,
    label: PROGRAM_CATEGORY_LABELS[category],
  })),
];

export function ProgramEncyclopediaExplorer({
  programs,
}: {
  programs: readonly DiscoverProgram[];
}) {
  const cards = useMemo(() => programs.map(toProgramExplorerCard), [programs]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("ALL");

  const results = useMemo(
    () => filterProgramExplorerCards(cards, programs, query, filter),
    [cards, programs, query, filter],
  );

  return (
    <div className="program-encyclopedia-explorer">
      <header className="program-encyclopedia-explorer__hero">
        <h1>دانشنامه مقاطع و دوره‌های دانشگاهی</h1>
        <p className="program-encyclopedia-explorer__lead">
          دانشگاه فقط انتخاب «رشته» نیست. نوع مقطع، دوره، دانشگاه و شیوه پذیرش هم می‌تواند تجربه
          تحصیل و آینده شما را تغییر دهد.
        </p>
        <p className="program-encyclopedia-explorer__meta">
          {toPersianDigits(programs.length)} موضوع آموزشی در چهار دسته — برای فهمیدن قبل از
          انتخاب، نه جایگزین دفترچه رسمی.
        </p>
      </header>

      <p className="program-encyclopedia-explorer__crosslink">
        <Link href="/discover/majors">دانشنامه رشته‌ها</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/discover/systems">نظام‌های دانشگاهی</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/discover">کانون کشف</Link>
      </p>

      <div className="program-encyclopedia-explorer__toolbar">
        <label className="program-encyclopedia-explorer__search">
          <span className="sr-only">جستجو</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="نام مقطع، دوره یا شیوه پذیرش را جستجو کنید..."
            autoComplete="off"
          />
        </label>

        <div className="program-encyclopedia-explorer__filters" role="group" aria-label="دسته‌بندی">
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

        <p className="program-encyclopedia-explorer__count" aria-live="polite">
          {toPersianDigits(results.length)} نتیجه
          {filter !== "ALL" ? ` در «${PROGRAM_CATEGORY_LABELS[filter as DiscoverProgramCategory]}»` : ""}
          {query.trim() ? ` برای «${query.trim()}»` : ""}
        </p>
      </div>

      {results.length === 0 ? (
        <div className="program-encyclopedia-explorer__empty">
          <p>موردی با این فیلتر پیدا نشد.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("ALL");
            }}
          >
            نمایش همه
          </button>
        </div>
      ) : (
        <ProgramCardGrid results={results} />
      )}
    </div>
  );
}

function ProgramCardGrid({ results }: { results: ProgramExplorerCard[] }) {
  return (
    <ul className="program-encyclopedia-explorer__grid">
      {results.map((item) => (
        <li key={item.slug}>
          <article className="program-encyclopedia-card">
            <span className={`program-encyclopedia-card__category program-encyclopedia-card__category--${item.category.toLowerCase()}`}>
              {item.categoryLabel}
            </span>
            <h2>{item.title}</h2>
            <p className="program-encyclopedia-card__summary">{item.summary}</p>
            {item.keyFacts.length > 0 ? (
              <ul className="program-encyclopedia-card__facts">
                {item.keyFacts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            ) : null}
            <p className="program-encyclopedia-card__suitable">
              <strong>برای چه کسی مهم است؟</strong> {item.suitableHint}
            </p>
            <Link href={item.href} className="program-encyclopedia-card__cta">
              مشاهده توضیحات کامل
            </Link>
          </article>
        </li>
      ))}
    </ul>
  );
}
