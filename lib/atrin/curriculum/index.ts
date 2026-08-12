/**
 * Atrin Curriculum Engine
 * Books → Subjects → Grades → Chapters → Lessons → Pages → Exercises → Knowledge Graph
 */

export type * from "@/lib/atrin/curriculum/types";
export { createSeedCurriculumCatalog } from "@/lib/atrin/curriculum/catalog";
export {
  getCurriculumCatalog,
  setCurriculumCatalog,
  resetCurriculumCatalog,
  getCurriculumItemById,
  getCurriculumBookById,
  getCurriculumChapterById,
  getCurriculumLessonById,
  getCurriculumExerciseById,
  getCurriculumTopicById,
  listCurriculumByGrade,
  listCurriculumBySubject,
} from "@/lib/atrin/curriculum/registry";
export {
  buildCurriculumKnowledgeGraph,
  getRelatedTopics,
  getLearningPathNeighbors,
} from "@/lib/atrin/curriculum/graph";
export { searchCurriculum } from "@/lib/atrin/curriculum/search";
export {
  createCurriculumImportJob,
  CURRICULUM_IMPORT_ADAPTERS,
  getCurriculumImportAdapter,
  enqueueCurriculumImport,
} from "@/lib/atrin/curriculum/import";
