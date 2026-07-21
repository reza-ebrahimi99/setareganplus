"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Option = { slug: string; name: string };

type AchievementFiltersProps = {
  categories: Option[];
  grades: Option[];
  schoolYears: string[];
  activeCategory: string;
  activeGrade: string;
  activeSchoolYear: string;
  initialQuery: string;
};

const SEARCH_DEBOUNCE_MS = 400;

function buildHref(params: {
  q: string;
  category: string;
  grade: string;
  schoolYear: string;
  page?: number;
}) {
  const search = new URLSearchParams();
  if (params.q.trim()) search.set("q", params.q.trim());
  if (params.category) search.set("category", params.category);
  if (params.grade) search.set("grade", params.grade);
  if (params.schoolYear) search.set("schoolYear", params.schoolYear);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const qs = search.toString();
  return qs ? `/achievements?${qs}` : "/achievements";
}

export function AchievementFilters({
  categories,
  grades,
  schoolYears,
  activeCategory,
  activeGrade,
  activeSchoolYear,
  initialQuery,
}: AchievementFiltersProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === initialQuery.trim()) return;
    const timer = window.setTimeout(() => {
      startTransition(() => {
        router.replace(
          buildHref({
            q: trimmed,
            category: activeCategory,
            grade: activeGrade,
            schoolYear: activeSchoolYear,
          }),
          { scroll: false },
        );
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [
    query,
    initialQuery,
    activeCategory,
    activeGrade,
    activeSchoolYear,
    router,
  ]);

  return (
    <div className={`space-y-4 ${pending ? "opacity-80" : ""}`}>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-primary">جستجو</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="عنوان، صادرکننده یا مقام"
          className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
          autoComplete="off"
          inputMode="search"
        />
      </label>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        <Link
          href={buildHref({
            q: query,
            category: "",
            grade: activeGrade,
            schoolYear: activeSchoolYear,
          })}
          scroll={false}
          className={`shrink-0 rounded-full border px-4 py-2.5 text-sm whitespace-nowrap ${
            !activeCategory
              ? "border-primary bg-primary text-white"
              : "border-border bg-surface text-primary"
          }`}
        >
          همه دسته‌ها
        </Link>
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={buildHref({
              q: query,
              category: category.slug,
              grade: activeGrade,
              schoolYear: activeSchoolYear,
            })}
            scroll={false}
            className={`shrink-0 rounded-full border px-4 py-2.5 text-sm whitespace-nowrap ${
              activeCategory === category.slug
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface text-primary"
            }`}
          >
            {category.name}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1.5 block font-medium text-primary">پایه</span>
          <select
            className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
            value={activeGrade}
            onChange={(event) => {
              startTransition(() => {
                router.replace(
                  buildHref({
                    q: query,
                    category: activeCategory,
                    grade: event.target.value,
                    schoolYear: activeSchoolYear,
                  }),
                  { scroll: false },
                );
              });
            }}
          >
            <option value="">همه پایه‌ها</option>
            {grades.map((grade) => (
              <option key={grade.slug} value={grade.slug}>
                {grade.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block font-medium text-primary">
            سال تحصیلی
          </span>
          <select
            className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
            value={activeSchoolYear}
            onChange={(event) => {
              startTransition(() => {
                router.replace(
                  buildHref({
                    q: query,
                    category: activeCategory,
                    grade: activeGrade,
                    schoolYear: event.target.value,
                  }),
                  { scroll: false },
                );
              });
            }}
          >
            <option value="">همه سال‌ها</option>
            {schoolYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
