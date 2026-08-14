"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import type { PublicAchievementCard } from "@/lib/website/achievements";
import { toPersianDigits } from "@/lib/persian";

type AchievementsShowcaseClientProps = {
  achievements: PublicAchievementCard[];
  emptyMessage: string;
};

export function AchievementsShowcaseClient({
  achievements,
  emptyMessage,
}: AchievementsShowcaseClientProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const deferredQuery = useDeferredValue(query.trim());

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of achievements) {
      map.set(item.categorySlug, item.categoryName);
    }
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [achievements]);

  const filtered = useMemo(() => {
    const q = deferredQuery.toLocaleLowerCase("fa");
    return achievements.filter((item) => {
      if (category !== "all" && item.categorySlug !== category) return false;
      if (!q) return true;
      const haystack = [
        item.title,
        item.shortDescription ?? "",
        item.categoryName,
        item.place ?? "",
        item.level ?? "",
        item.schoolYear ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("fa");
      return haystack.includes(q);
    });
  }, [achievements, category, deferredQuery]);

  const spotlight = filtered[0] ?? null;
  const rest = filtered.slice(1);

  if (achievements.length === 0) {
    return (
      <div className="achievements-empty mt-10 rounded-[1.5rem] border border-dashed border-border/90 bg-white/40 px-6 py-12 text-center backdrop-blur-sm">
        <p className="text-sm leading-8 text-muted">{toPersianDigits(emptyMessage)}</p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="فیلتر دسته‌بندی افتخارات"
        >
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`achievement-filter-chip${
              category === "all" ? " achievement-filter-chip--active" : ""
            }`}
          >
            همه
          </button>
          {categories.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => setCategory(item.slug)}
              className={`achievement-filter-chip${
                category === item.slug ? " achievement-filter-chip--active" : ""
              }`}
            >
              {toPersianDigits(item.name)}
            </button>
          ))}
        </div>

        <label className="relative block w-full max-w-sm">
          <span className="sr-only">جستجوی افتخارات</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجو در افتخارات…"
            className="achievement-search-input"
          />
        </label>
      </div>

      {spotlight ? (
        <div className="mt-8">
          <AchievementCard
            achievement={spotlight}
            size="spotlight"
            featured
            priority
          />
        </div>
      ) : (
        <div className="achievements-empty mt-8 rounded-[1.5rem] border border-dashed border-border/90 bg-white/40 px-6 py-10 text-center">
          <p className="text-sm text-muted">
            {toPersianDigits("نتیجه‌ای با این فیلتر یافت نشد.")}
          </p>
        </div>
      )}

      {rest.length > 0 ? (
        <ul className="achievements-masonry mt-6">
          {rest.map((achievement, index) => (
            <li key={achievement.id} className="achievements-masonry-item">
              <AchievementCard
                achievement={achievement}
                featured={achievement.isFeatured}
                priority={index < 2}
              />
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-5 text-center text-xs text-muted">
        {toPersianDigits(
          `${filtered.length} مورد از ${achievements.length} افتخار نمایش‌داده‌شده`,
        )}
      </p>
    </div>
  );
}
