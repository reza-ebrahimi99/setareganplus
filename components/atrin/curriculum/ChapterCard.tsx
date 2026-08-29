"use client";

import type { CurriculumChapter } from "@/lib/atrin/curriculum";

type ChapterCardProps = {
  chapter: CurriculumChapter;
  bookTitle?: string;
};

export function ChapterCard({ chapter, bookTitle }: ChapterCardProps) {
  return (
    <section
      className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-right"
      aria-label={`فصل ${chapter.title}`}
    >
      <p className="text-[11px] text-white/45">
        {bookTitle ? `${bookTitle} · ` : ""}فصل {chapter.order}
      </p>
      <h4 className="mt-1 text-sm font-medium text-white">{chapter.title}</h4>
      {chapter.pageStart != null ? (
        <p className="mt-1 text-xs text-white/50">
          ص {chapter.pageStart}
          {chapter.pageEnd != null ? `–${chapter.pageEnd}` : ""}
        </p>
      ) : null}
    </section>
  );
}
