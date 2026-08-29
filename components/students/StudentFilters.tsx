"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type GradeOption = { slug: string; name: string };

type StudentFiltersProps = {
  grades: GradeOption[];
  activeGrade: string;
  initialQuery: string;
};

const SEARCH_DEBOUNCE_MS = 400;

function buildStudentsHref(q: string, grade: string, page?: number) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (grade) params.set("grade", grade);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/students?${query}` : "/students";
}

export function StudentFilters({
  grades,
  activeGrade,
  initialQuery,
}: StudentFiltersProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const trimmed = query.trim();
    const initial = initialQuery.trim();
    if (trimmed === initial) return;

    const timer = window.setTimeout(() => {
      startTransition(() => {
        router.replace(buildStudentsHref(trimmed, activeGrade), {
          scroll: false,
        });
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, initialQuery, activeGrade, router]);

  return (
    <div className={`space-y-4 ${pending ? "opacity-80" : ""}`}>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-primary">جستجو</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="نام، نام خانوادگی، ولی یا سال تحصیلی"
          className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
          autoComplete="off"
          inputMode="search"
        />
        <span className="mt-1 block text-xs text-muted">
          جستجو با کمی تأخیر و از طریق آدرس صفحه انجام می‌شود.
        </span>
      </label>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        <Link
          href={buildStudentsHref(query, "")}
          scroll={false}
          className={`shrink-0 rounded-full border px-4 py-2.5 text-sm whitespace-nowrap ${
            !activeGrade
              ? "border-primary bg-primary text-white"
              : "border-border bg-surface text-primary"
          }`}
        >
          همه
        </Link>
        {grades.map((grade) => (
          <Link
            key={grade.slug}
            href={buildStudentsHref(query, grade.slug)}
            scroll={false}
            className={`shrink-0 rounded-full border px-4 py-2.5 text-sm whitespace-nowrap ${
              activeGrade === grade.slug
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface text-primary"
            }`}
          >
            {grade.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
