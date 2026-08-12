import type {
  EducationGrade,
  EducationSubject,
  StudyProfile,
} from "@/lib/atrin/education/types";

const KEY = "atrin-study-profile-v1";

const EMPTY: StudyProfile = {
  preferredGrade: null,
  favoriteSubject: null,
  preferredSubject: null,
  weakness: null,
  weakTopics: [],
  strongTopics: [],
  preferredStyle: null,
  learningHistory: [],
  completedLessons: [],
  recentExercises: [],
  recentLessons: [],
  recentMistakes: [],
  recentPrompts: [],
  updatedAt: null,
};

function asStringList(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string").slice(0, max);
}

export function loadStudyProfile(): StudyProfile {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<StudyProfile>;
    const favoriteSubject =
      typeof parsed.favoriteSubject === "string"
        ? (parsed.favoriteSubject as EducationSubject)
        : null;
    const preferredSubject =
      typeof parsed.preferredSubject === "string"
        ? (parsed.preferredSubject as EducationSubject)
        : favoriteSubject;

    return {
      preferredGrade:
        typeof parsed.preferredGrade === "number"
          ? (parsed.preferredGrade as EducationGrade)
          : null,
      favoriteSubject,
      preferredSubject,
      weakness: typeof parsed.weakness === "string" ? parsed.weakness : null,
      weakTopics: asStringList(parsed.weakTopics),
      strongTopics: asStringList(parsed.strongTopics),
      preferredStyle:
        parsed.preferredStyle === "step_by_step" ||
        parsed.preferredStyle === "hint_first" ||
        parsed.preferredStyle === "full_solution"
          ? parsed.preferredStyle
          : null,
      learningHistory: asStringList(parsed.learningHistory, 24),
      completedLessons: asStringList(parsed.completedLessons, 24),
      recentExercises: asStringList(parsed.recentExercises),
      recentLessons: asStringList(parsed.recentLessons),
      recentMistakes: asStringList(parsed.recentMistakes),
      recentPrompts: asStringList(parsed.recentPrompts),
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : null,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveStudyProfile(profile: StudyProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...profile, updatedAt: Date.now() }),
    );
  } catch {
    // ignore
  }
}

export function updateStudyProfileFromAnalysis(input: {
  prompt: string;
  subject: EducationSubject;
  grade: EducationGrade;
  homeworkMode?: boolean;
  style?: StudyProfile["preferredStyle"];
  topic?: string;
  lessonId?: string;
  exerciseId?: string;
}): StudyProfile {
  const current = loadStudyProfile();
  const subjectLabel =
    input.subject !== "unknown" ? input.subject : null;

  const next: StudyProfile = {
    ...current,
    preferredGrade: input.grade ?? current.preferredGrade,
    favoriteSubject: subjectLabel ?? current.favoriteSubject,
    preferredSubject: subjectLabel ?? current.preferredSubject,
    preferredStyle: input.style ?? current.preferredStyle,
    recentPrompts: [
      input.prompt,
      ...current.recentPrompts.filter((p) => p !== input.prompt),
    ].slice(0, 8),
    recentLessons: subjectLabel
      ? [
          subjectLabel,
          ...current.recentLessons.filter((s) => s !== subjectLabel),
        ].slice(0, 8)
      : current.recentLessons,
    learningHistory: [
      `${input.subject}:${input.prompt.slice(0, 60)}`,
      ...current.learningHistory,
    ].slice(0, 24),
    completedLessons: input.lessonId
      ? [
          input.lessonId,
          ...current.completedLessons.filter((id) => id !== input.lessonId),
        ].slice(0, 24)
      : current.completedLessons,
    recentExercises: input.exerciseId
      ? [
          input.exerciseId,
          ...current.recentExercises.filter((id) => id !== input.exerciseId),
        ].slice(0, 12)
      : current.recentExercises,
    recentMistakes: input.homeworkMode
      ? current.recentMistakes
      : current.recentMistakes,
    updatedAt: Date.now(),
  };

  if (input.subject === "math" && /کسر|fraction/i.test(input.prompt)) {
    next.weakness = "Fractions";
    next.weakTopics = [
      "Fractions",
      ...current.weakTopics.filter((t) => t !== "Fractions"),
    ].slice(0, 12);
  }

  if (input.topic) {
    next.strongTopics = [
      input.topic,
      ...current.strongTopics.filter((t) => t !== input.topic),
    ].slice(0, 12);
  }

  saveStudyProfile(next);
  return next;
}

/** Mark a curriculum lesson complete in the local study profile. */
export function markLessonCompleted(lessonId: string): StudyProfile {
  const current = loadStudyProfile();
  const next: StudyProfile = {
    ...current,
    completedLessons: [
      lessonId,
      ...current.completedLessons.filter((id) => id !== lessonId),
    ].slice(0, 24),
    updatedAt: Date.now(),
  };
  saveStudyProfile(next);
  return next;
}

/** Record a weak topic for adaptive teaching (local only). */
export function recordWeakTopic(topic: string): StudyProfile {
  const current = loadStudyProfile();
  const next: StudyProfile = {
    ...current,
    weakness: topic,
    weakTopics: [
      topic,
      ...current.weakTopics.filter((t) => t !== topic),
    ].slice(0, 12),
    updatedAt: Date.now(),
  };
  saveStudyProfile(next);
  return next;
}
