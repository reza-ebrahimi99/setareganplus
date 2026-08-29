"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Option = { slug: string; name: string };
type TypeOption = { value: string; label: string };

type AssessmentFiltersProps = {
  providers: Option[];
  grades: Option[];
  types: TypeOption[];
  schoolYears: string[];
  activeProvider: string;
  activeGrade: string;
  activeType: string;
  activeSchoolYear: string;
  initialQuery: string;
};

const SEARCH_DEBOUNCE_MS = 400;

function buildHref(params: {
  q: string;
  provider: string;
  grade: string;
  type: string;
  schoolYear: string;
}) {
  const search = new URLSearchParams();
  if (params.q.trim()) search.set("q", params.q.trim());
  if (params.provider) search.set("provider", params.provider);
  if (params.grade) search.set("grade", params.grade);
  if (params.type) search.set("type", params.type);
  if (params.schoolYear) search.set("schoolYear", params.schoolYear);
  const qs = search.toString();
  return qs ? `/assessments?${qs}` : "/assessments";
}

export function AssessmentFilters({
  providers,
  grades,
  types,
  schoolYears,
  activeProvider,
  activeGrade,
  activeType,
  activeSchoolYear,
  initialQuery,
}: AssessmentFiltersProps) {
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
            provider: activeProvider,
            grade: activeGrade,
            type: activeType,
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
    activeProvider,
    activeGrade,
    activeType,
    activeSchoolYear,
    router,
  ]);

  return (
    <div
      className={`space-y-4 ${pending ? "opacity-70" : ""}`}
      aria-busy={pending}
    >
      <label className="block text-sm">
        <span className="mb-1 block text-muted">جستجو</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          placeholder="عنوان آزمون…"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          href={buildHref({
            q: query,
            provider: "",
            grade: activeGrade,
            type: activeType,
            schoolYear: activeSchoolYear,
          })}
          active={!activeProvider}
          label="همه ارائه‌دهندگان"
        />
        {providers.map((provider) => (
          <FilterChip
            key={provider.slug}
            href={buildHref({
              q: query,
              provider: provider.slug,
              grade: activeGrade,
              type: activeType,
              schoolYear: activeSchoolYear,
            })}
            active={activeProvider === provider.slug}
            label={provider.name}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          href={buildHref({
            q: query,
            provider: activeProvider,
            grade: "",
            type: activeType,
            schoolYear: activeSchoolYear,
          })}
          active={!activeGrade}
          label="همه پایه‌ها"
        />
        {grades.map((grade) => (
          <FilterChip
            key={grade.slug}
            href={buildHref({
              q: query,
              provider: activeProvider,
              grade: grade.slug,
              type: activeType,
              schoolYear: activeSchoolYear,
            })}
            active={activeGrade === grade.slug}
            label={grade.name}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          href={buildHref({
            q: query,
            provider: activeProvider,
            grade: activeGrade,
            type: "",
            schoolYear: activeSchoolYear,
          })}
          active={!activeType}
          label="همه انواع"
        />
        {types.map((type) => (
          <FilterChip
            key={type.value}
            href={buildHref({
              q: query,
              provider: activeProvider,
              grade: activeGrade,
              type: type.value,
              schoolYear: activeSchoolYear,
            })}
            active={activeType === type.value}
            label={type.label}
          />
        ))}
      </div>

      {schoolYears.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <FilterChip
            href={buildHref({
              q: query,
              provider: activeProvider,
              grade: activeGrade,
              type: activeType,
              schoolYear: "",
            })}
            active={!activeSchoolYear}
            label="همه سال‌ها"
          />
          {schoolYears.map((year) => (
            <FilterChip
              key={year}
              href={buildHref({
                q: query,
                provider: activeProvider,
                grade: activeGrade,
                type: activeType,
                schoolYear: year,
              })}
              active={activeSchoolYear === year}
              label={year}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-xs transition ${
        active
          ? "bg-primary text-white"
          : "border border-border bg-surface text-muted hover:border-primary/40"
      }`}
      scroll={false}
    >
      {label}
    </Link>
  );
}
