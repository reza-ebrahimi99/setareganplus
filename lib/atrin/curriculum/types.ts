/**
 * Atrin Curriculum Engine — structured content model.
 * All UI must read from this layer; never hardcode curriculum in components.
 */

import type {
  EducationDifficulty,
  EducationGrade,
  EducationSubject,
} from "@/lib/atrin/education/types";

export type CurriculumResourceKind =
  | "pdf"
  | "video"
  | "audio"
  | "worksheet"
  | "link"
  | "faq"
  | "exam"
  | "gifted"
  | "konkur"
  | "other";

export type CurriculumFutureResource = {
  id: string;
  kind: CurriculumResourceKind;
  title: string;
  /** Future URI / CMS id — not fetched yet */
  ref?: string;
};

export type CurriculumImportance = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Canonical curriculum item — book → chapter → lesson → page → exercise.
 */
export type CurriculumItem = {
  id: string;
  grade: EducationGrade;
  subject: EducationSubject;
  book: string;
  bookId: string;
  chapter: string;
  chapterId: string;
  lesson: string;
  lessonId: string;
  pageStart: number | null;
  pageEnd: number | null;
  exerciseNumber?: number | null;
  keywords: string[];
  learningObjectives: string[];
  relatedTopicIds: string[];
  prerequisiteIds: string[];
  difficulty: EducationDifficulty;
  examImportance: CurriculumImportance;
  giftedImportance: CurriculumImportance;
  konkurImportance: CurriculumImportance;
  estimatedStudyMinutes: number;
  futureResources: CurriculumFutureResource[];
};

export type CurriculumBook = {
  id: string;
  title: string;
  grade: EducationGrade;
  subject: EducationSubject;
  publisher?: string;
  chapterIds: string[];
};

export type CurriculumChapter = {
  id: string;
  bookId: string;
  title: string;
  order: number;
  lessonIds: string[];
  pageStart: number | null;
  pageEnd: number | null;
};

export type CurriculumLesson = {
  id: string;
  chapterId: string;
  bookId: string;
  title: string;
  order: number;
  pageStart: number | null;
  pageEnd: number | null;
  itemIds: string[];
  learningObjectives: string[];
};

export type CurriculumExercise = {
  id: string;
  lessonId: string;
  chapterId: string;
  bookId: string;
  number: number;
  promptHint: string;
  difficulty: EducationDifficulty;
  itemId: string;
};

export type CurriculumTopicNode = {
  id: string;
  label: string;
  subject: EducationSubject;
  grade: EducationGrade;
  keywords: string[];
  relatedTopicIds: string[];
  previousLessonId: string | null;
  nextLessonId: string | null;
  exerciseIds: string[];
  videoResourceIds: string[];
  faqResourceIds: string[];
  examQuestionIds: string[];
  giftedQuestionIds: string[];
  konkurQuestionIds: string[];
};

/** Future-ready knowledge graph (interfaces + in-memory edges). */
export type CurriculumGraphEdgeKind =
  | "related"
  | "prerequisite"
  | "previous"
  | "next"
  | "exercise"
  | "video"
  | "faq"
  | "exam"
  | "gifted"
  | "konkur";

export type CurriculumGraphEdge = {
  from: string;
  to: string;
  kind: CurriculumGraphEdgeKind;
  weight?: number;
};

export type CurriculumKnowledgeGraph = {
  nodes: CurriculumTopicNode[];
  edges: CurriculumGraphEdge[];
};

export type CurriculumSearchQueryKind =
  | "page"
  | "exercise"
  | "lesson"
  | "chapter"
  | "topic"
  | "keyword"
  | "unknown";

export type CurriculumSearchHit = {
  item: CurriculumItem;
  score: number;
  reason: string;
};

export type CurriculumSearchResult = {
  query: string;
  kind: CurriculumSearchQueryKind;
  confidence: number;
  hits: CurriculumSearchHit[];
  /** When confidence is low — never hallucinate */
  needsClarification: boolean;
  clarificationPrompt: string | null;
};

export type CurriculumCatalog = {
  books: CurriculumBook[];
  chapters: CurriculumChapter[];
  lessons: CurriculumLesson[];
  exercises: CurriculumExercise[];
  items: CurriculumItem[];
  topics: CurriculumTopicNode[];
};

/** Book import pipeline — architecture only (no parsers yet). */
export type CurriculumImportSourceKind =
  | "official_pdf"
  | "markdown"
  | "json"
  | "cms"
  | "database";

export type CurriculumImportJob = {
  id: string;
  sourceKind: CurriculumImportSourceKind;
  sourceRef: string;
  status: "queued" | "parsing" | "mapped" | "ready" | "failed" | "not_implemented";
  createdAt: number;
  error?: string;
};

export type CurriculumImportAdapter = {
  readonly id: string;
  readonly sourceKind: CurriculumImportSourceKind;
  /** Future: parse source into catalog draft */
  prepare(job: CurriculumImportJob): Promise<CurriculumImportJob>;
};
