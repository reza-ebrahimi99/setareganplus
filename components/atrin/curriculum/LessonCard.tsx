"use client";

import type { CurriculumLesson } from "@/lib/atrin/curriculum";

type LessonCardProps = {
  lesson: CurriculumLesson;
};

export function LessonCard({ lesson }: LessonCardProps) {
  return (
    <section
      className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-right"
      aria-label={`درس ${lesson.title}`}
    >
      <p className="text-[11px] text-cyan-200/70">درس {lesson.order}</p>
      <h4 className="mt-1 text-sm font-medium text-white">{lesson.title}</h4>
      {lesson.learningObjectives[0] ? (
        <p className="mt-2 text-xs leading-6 text-white/65">
          {lesson.learningObjectives[0]}
        </p>
      ) : null}
    </section>
  );
}
