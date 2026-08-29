"use client";

import { useMemo, useState } from "react";
import {
  CurriculumCard,
  ChapterCard,
  LessonCard,
  TopicCard,
  ExerciseCard,
  LearningPath,
  Prerequisites,
  RelatedTopics,
} from "@/components/atrin/curriculum";
import {
  getCurriculumBookById,
  getCurriculumCatalog,
  getCurriculumChapterById,
  getCurriculumExerciseById,
  getCurriculumLessonById,
  getCurriculumTopicById,
  searchCurriculum,
} from "@/lib/atrin/curriculum";

type CurriculumExplorerProps = {
  initialQuery?: string;
  onAsk?: (prompt: string) => void;
};

/**
 * Reusable curriculum presentation — data from Curriculum Engine only.
 */
export function CurriculumExplorer({
  initialQuery = "",
  onAsk,
}: CurriculumExplorerProps) {
  const [query, setQuery] = useState(initialQuery);
  const result = useMemo(
    () => (query.trim() ? searchCurriculum(query) : null),
    [query],
  );
  const hit = result?.hits[0]?.item;
  const chapter = hit ? getCurriculumChapterById(hit.chapterId) : null;
  const lesson = hit ? getCurriculumLessonById(hit.lessonId) : null;
  const book = hit ? getCurriculumBookById(hit.bookId) : null;
  const topic = hit?.relatedTopicIds[0]
    ? getCurriculumTopicById(hit.relatedTopicIds[0])
    : null;
  const exercise = hit
    ? getCurriculumCatalog().exercises.find((e) => e.itemId === hit.id)
    : null;

  return (
    <div
      className="atrin-curriculum-explorer space-y-3"
      dir="rtl"
      aria-label="کاوشگر برنامه درسی آترین"
    >
      <label className="block space-y-1 text-right">
        <span className="text-xs text-white/55">جستجوی برنامه درسی</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="مثلاً صفحه ۷۲، تمرین ۴، کسرها"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/40"
        />
      </label>

      {result?.needsClarification ? (
        <p className="text-xs leading-6 text-amber-200/90" role="status">
          {result.clarificationPrompt}
        </p>
      ) : null}

      {hit ? (
        <div className="space-y-3">
          <CurriculumCard
            item={hit}
            onSelect={
              onAsk
                ? (item) =>
                    onAsk(
                      `موضوع «${item.lesson}» از ${item.book} را مثل معلم توضیح بده`,
                    )
                : undefined
            }
          />
          {chapter ? (
            <ChapterCard chapter={chapter} bookTitle={book?.title} />
          ) : null}
          {lesson ? <LessonCard lesson={lesson} /> : null}
          {topic ? (
            <>
              <TopicCard topic={topic} />
              <LearningPath topic={topic} />
              <RelatedTopics topic={topic} />
            </>
          ) : null}
          <Prerequisites prerequisiteIds={hit.prerequisiteIds} />
          {exercise ? (
            <ExerciseCard
              exercise={exercise}
              onPractice={
                onAsk
                  ? (ex) => {
                      const full = getCurriculumExerciseById(ex.id);
                      onAsk(
                        `یک تمرین مشابه تمرین ${full?.number ?? ex.number} بساز`,
                      );
                    }
                  : undefined
              }
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
