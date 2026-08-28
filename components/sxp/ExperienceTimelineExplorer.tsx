"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import {
  timelineEventTone,
  timelineEventToneLabel,
} from "@/lib/sxp/engine/event-presentation";
import type { TimelineTypeFilter } from "@/lib/sxp/engine/timeline-query";
import type { ExperienceTimelineDto, ExperienceTimelineItemDto } from "@/lib/sxp/hub/load-timeline";
import type { TimelineDayGroup } from "@/lib/sxp/engine/timeline-query";

const FILTERS: Array<{ value: TimelineTypeFilter; label: string }> = [
  { value: "all", label: "همه" },
  { value: "booking", label: "رزرو" },
  { value: "form", label: "فرم" },
  { value: "sms", label: "پیامک" },
  { value: "file", label: "فایل" },
];

function ToneIcon({ tone }: { tone: ReturnType<typeof timelineEventTone> }) {
  const common = "size-4";
  if (tone === "booking") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (tone === "form") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 3h8l4 4v14H7V3Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M15 3v5h5M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (tone === "sms") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 5h14v10H8l-3 3V5Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    );
  }
  if (tone === "file") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4v10M8 10l4 4 4-4M5 18h14" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function mergeGroups(
  current: TimelineDayGroup<ExperienceTimelineItemDto>[],
  incoming: TimelineDayGroup<ExperienceTimelineItemDto>[],
): TimelineDayGroup<ExperienceTimelineItemDto>[] {
  const next = current.map((group) => ({ ...group, items: [...group.items] }));
  const index = new Map(next.map((group) => [group.dayKey, group]));
  for (const group of incoming) {
    const existing = index.get(group.dayKey);
    if (!existing) {
      const copy = { ...group, items: [...group.items] };
      next.push(copy);
      index.set(group.dayKey, copy);
      continue;
    }
    const seen = new Set(existing.items.map((item) => item.id));
    for (const item of group.items) {
      if (!seen.has(item.id)) existing.items.push(item);
    }
  }
  return next;
}

type ExperienceTimelineExplorerProps = {
  timeline: ExperienceTimelineDto;
};

export function ExperienceTimelineExplorer({
  timeline,
}: ExperienceTimelineExplorerProps) {
  const router = useRouter();
  const [query, setQuery] = useState(timeline.query);
  const [groups, setGroups] = useState(timeline.groups);
  const [nextCursor, setNextCursor] = useState(timeline.nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const itemCount = useMemo(
    () => groups.reduce((sum, group) => sum + group.items.length, 0),
    [groups],
  );

  useEffect(() => {
    setQuery(timeline.query);
    setGroups(timeline.groups);
    setNextCursor(timeline.nextCursor);
  }, [timeline.query, timeline.type, timeline.groups, timeline.nextCursor]);

  useEffect(() => {
    if (!nextCursor) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingMore) return;
        void loadMore();
      },
      { rootMargin: "160px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextCursor, loadingMore, timeline.feedHref, timeline.query, timeline.type]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const url = new URL(timeline.feedHref, window.location.origin);
      if (timeline.query) url.searchParams.set("q", timeline.query);
      if (timeline.type !== "all") url.searchParams.set("type", timeline.type);
      url.searchParams.set("cursor", nextCursor);
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return;
      const body = (await response.json()) as {
        groups: TimelineDayGroup<ExperienceTimelineItemDto>[];
        nextCursor: string | null;
      };
      setGroups((current) => mergeGroups(current, body.groups ?? []));
      setNextCursor(body.nextCursor ?? null);
    } finally {
      setLoadingMore(false);
    }
  }

  function applyFilters(nextType: TimelineTypeFilter, nextQuery = query) {
    const params = new URLSearchParams();
    const trimmed = nextQuery.trim();
    if (trimmed) params.set("q", trimmed);
    if (nextType !== "all") params.set("type", nextType);
    const suffix = params.toString();
    router.push(suffix ? `?${suffix}` : "?");
  }

  return (
    <div className="mx-auto w-full max-w-[840px] space-y-5">
      <div>
        <h1 className="text-xl font-bold text-primary sm:text-2xl">روند</h1>
        <p className="mt-1 text-sm text-muted">
          تاریخچه رویدادهای حساب {timeline.displayName}
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters(timeline.type, query);
        }}
      >
        <label className="sr-only" htmlFor="sxp-timeline-search">
          جستجوی روند
        </label>
        <input
          id="sxp-timeline-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جستجو در عنوان و خلاصه"
          className="min-h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-primary outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
        />
        <button
          type="submit"
          className="min-h-11 rounded-xl border border-secondary/30 bg-secondary/10 px-4 text-sm font-medium text-primary"
        >
          جستجو
        </button>
      </form>

      <div className="flex flex-wrap gap-2" role="group" aria-label="فیلتر روند">
        {FILTERS.map((filter) => {
          const active = timeline.type === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => applyFilters(filter.value)}
              className={
                active
                  ? "min-h-11 rounded-full border border-secondary/30 bg-secondary/10 px-3.5 text-sm font-medium text-primary"
                  : "min-h-11 rounded-full border border-border bg-background px-3.5 text-sm font-medium text-muted"
              }
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {itemCount === 0 ? (
        <PortalEmptyState
          title="هنوز رویدادی نیست"
          description="رزرو، فرم و پیامک‌های حساب شما پس از پردازش موتور تجربه اینجا می‌آیند."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.dayKey}>
              <h2 className="mb-3 text-sm font-semibold text-muted">
                {group.label}
              </h2>
              <ol className="space-y-3">
                {group.items.map((item) => {
                  const tone = timelineEventTone(item.eventType);
                  return (
                    <li key={item.id} className="admin-card flex gap-3 p-4">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
                        <ToneIcon tone={tone} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-muted">
                          {timelineEventToneLabel(tone)}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-primary">
                          {item.title}
                        </p>
                        {item.summary ? (
                          <p className="mt-1 text-sm text-muted">{item.summary}</p>
                        ) : null}
                        <p className="mt-2 text-xs text-muted">{item.relativeTime}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}

      {nextCursor ? (
        <div ref={sentinelRef} className="flex justify-center py-4">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="min-h-11 rounded-xl border border-border bg-background px-4 text-sm font-medium text-primary"
          >
            {loadingMore ? "در حال بارگذاری…" : "بارگذاری بیشتر"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
