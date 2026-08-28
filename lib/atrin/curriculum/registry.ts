/**
 * Curriculum registry — single source of structured content for UI/engines.
 */

import { createSeedCurriculumCatalog } from "@/lib/atrin/curriculum/catalog";
import type {
  CurriculumBook,
  CurriculumCatalog,
  CurriculumChapter,
  CurriculumExercise,
  CurriculumItem,
  CurriculumLesson,
  CurriculumTopicNode,
} from "@/lib/atrin/curriculum/types";
import type {
  EducationGrade,
  EducationSubject,
} from "@/lib/atrin/education/types";

let catalog: CurriculumCatalog = createSeedCurriculumCatalog();

export function getCurriculumCatalog(): CurriculumCatalog {
  return catalog;
}

/** Test / future CMS hook — replace in-memory catalog without touching UI. */
export function setCurriculumCatalog(next: CurriculumCatalog): void {
  catalog = next;
}

export function resetCurriculumCatalog(): void {
  catalog = createSeedCurriculumCatalog();
}

export function getCurriculumItemById(id: string): CurriculumItem | undefined {
  return catalog.items.find((i) => i.id === id);
}

export function getCurriculumBookById(id: string): CurriculumBook | undefined {
  return catalog.books.find((b) => b.id === id);
}

export function getCurriculumChapterById(
  id: string,
): CurriculumChapter | undefined {
  return catalog.chapters.find((c) => c.id === id);
}

export function getCurriculumLessonById(
  id: string,
): CurriculumLesson | undefined {
  return catalog.lessons.find((l) => l.id === id);
}

export function getCurriculumExerciseById(
  id: string,
): CurriculumExercise | undefined {
  return catalog.exercises.find((e) => e.id === id);
}

export function getCurriculumTopicById(
  id: string,
): CurriculumTopicNode | undefined {
  return catalog.topics.find((t) => t.id === id);
}

export function listCurriculumByGrade(
  grade: EducationGrade,
): CurriculumItem[] {
  if (grade == null) return [];
  return catalog.items.filter((i) => i.grade === grade);
}

export function listCurriculumBySubject(
  subject: EducationSubject,
): CurriculumItem[] {
  return catalog.items.filter((i) => i.subject === subject);
}
