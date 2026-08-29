"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type DepartmentOption = { slug: string; name: string };

type TeamFiltersProps = {
  departments: DepartmentOption[];
  activeDepartment: string;
  initialQuery: string;
};

const SEARCH_DEBOUNCE_MS = 400;

function buildTeamHref(q: string, department: string, page?: number) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (department) params.set("department", department);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/team?${query}` : "/team";
}

export function TeamFilters({
  departments,
  activeDepartment,
  initialQuery,
}: TeamFiltersProps) {
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
        router.replace(buildTeamHref(trimmed, activeDepartment), {
          scroll: false,
        });
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, initialQuery, activeDepartment, router]);

  return (
    <div className={`space-y-4 ${pending ? "opacity-80" : ""}`}>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-primary">جستجو</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="نام، سمت یا تخصص"
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
          href={buildTeamHref(query, "")}
          scroll={false}
          className={`shrink-0 rounded-full border px-4 py-2.5 text-sm whitespace-nowrap ${
            !activeDepartment
              ? "border-primary bg-primary text-white"
              : "border-border bg-surface text-primary"
          }`}
        >
          همه
        </Link>
        {departments.map((department) => (
          <Link
            key={department.slug}
            href={buildTeamHref(query, department.slug)}
            scroll={false}
            className={`shrink-0 rounded-full border px-4 py-2.5 text-sm whitespace-nowrap ${
              activeDepartment === department.slug
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface text-primary"
            }`}
          >
            {department.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
