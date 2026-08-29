"use client";

import type { CurriculumExercise } from "@/lib/atrin/curriculum";

type ExerciseCardProps = {
  exercise: CurriculumExercise;
  onPractice?: (exercise: CurriculumExercise) => void;
};

export function ExerciseCard({ exercise, onPractice }: ExerciseCardProps) {
  return (
    <section
      className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-right"
      aria-label={`تمرین ${exercise.number}`}
    >
      <p className="text-[11px] text-emerald-200/80">تمرین {exercise.number}</p>
      <p className="mt-1 text-sm text-white/85">{exercise.promptHint}</p>
      <p className="mt-2 text-[11px] text-white/45">سطح: {exercise.difficulty}</p>
      {onPractice ? (
        <button
          type="button"
          className="mt-2 text-xs text-emerald-300 underline-offset-4 hover:underline"
          onClick={() => onPractice(exercise)}
        >
          تمرین مشابه
        </button>
      ) : null}
    </section>
  );
}
