"use client";

import {
  getCurriculumLessonById,
  getLearningPathNeighbors,
  type CurriculumTopicNode,
} from "@/lib/atrin/curriculum";

type LearningPathProps = {
  topic: CurriculumTopicNode;
};

export function LearningPath({ topic }: LearningPathProps) {
  const { previousLessonId, nextLessonId } = getLearningPathNeighbors(topic.id);
  const prev = previousLessonId
    ? getCurriculumLessonById(previousLessonId)
    : null;
  const next = nextLessonId ? getCurriculumLessonById(nextLessonId) : null;

  return (
    <nav
      className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-right"
      aria-label="مسیر یادگیری"
    >
      <h4 className="text-sm font-medium text-white">مسیر یادگیری · {topic.label}</h4>
      <ol className="space-y-1 text-xs text-white/70">
        <li>قبل: {prev?.title ?? "شروع مسیر"}</li>
        <li className="text-cyan-200">الان: موضوع جاری</li>
        <li>بعد: {next?.title ?? "پایان مسیر"}</li>
      </ol>
    </nav>
  );
}
