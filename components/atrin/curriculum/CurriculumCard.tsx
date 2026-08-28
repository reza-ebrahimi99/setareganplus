"use client";

import type { CurriculumItem } from "@/lib/atrin/curriculum";

type CurriculumCardProps = {
  item: CurriculumItem;
  onSelect?: (item: CurriculumItem) => void;
};

export function CurriculumCard({ item, onSelect }: CurriculumCardProps) {
  return (
    <article
      className="atrin-curriculum-card space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-right"
      aria-label={`برنامه درسی ${item.lesson}`}
    >
      <header className="space-y-1">
        <p className="text-xs text-white/55">
          پایه {item.grade ?? "—"} · {item.subject}
        </p>
        <h3 className="text-sm font-semibold text-white">{item.book}</h3>
        <p className="text-sm text-white/80">{item.chapter}</p>
        <p className="text-base text-cyan-200">{item.lesson}</p>
      </header>
      {item.pageStart != null ? (
        <p className="text-xs text-white/50">
          صفحات {item.pageStart}
          {item.pageEnd != null ? `–${item.pageEnd}` : ""}
        </p>
      ) : null}
      {item.learningObjectives[0] ? (
        <p className="text-xs leading-6 text-white/70">
          {item.learningObjectives[0]}
        </p>
      ) : null}
      {onSelect ? (
        <button
          type="button"
          className="text-xs text-cyan-300 underline-offset-4 hover:underline"
          onClick={() => onSelect(item)}
        >
          انتخاب این بخش
        </button>
      ) : null}
    </article>
  );
}
