/**
 * Atrin Education Engine
 * Modular client-side pipeline: normalize → detect → strategy → format.
 * Does not call AI APIs or mutate backend/CRM.
 */

export type * from "@/lib/atrin/education/types";
export { normalizeEducationInput } from "@/lib/atrin/education/normalize";
export { detectEducationSubject } from "@/lib/atrin/education/detect-subject";
export { detectEducationGrade } from "@/lib/atrin/education/detect-grade";
export { detectEducationDifficulty } from "@/lib/atrin/education/detect-difficulty";
export { detectEducationIntent } from "@/lib/atrin/education/detect-intent";
export { detectEducationQuestionType } from "@/lib/atrin/education/detect-question-type";
export { chooseTeachingStrategy } from "@/lib/atrin/education/strategy";
export {
  formatEducationPlan,
  EDUCATION_ACTION_LABELS,
  promptForEducationAction,
} from "@/lib/atrin/education/format";
export {
  analyzeEducationInput,
  runEducationEngine,
} from "@/lib/atrin/education/analyze";
export {
  prepareEducationVisionInput,
  analyzeEducationVision,
  EDUCATION_VISION_ADAPTERS,
  type EducationVisionAdapter,
} from "@/lib/atrin/education/vision";
export {
  loadStudyProfile,
  saveStudyProfile,
  updateStudyProfileFromAnalysis,
  markLessonCompleted,
  recordWeakTopic,
} from "@/lib/atrin/education/study-profile";
export {
  detectMathTopics,
  detectChemistryTopics,
  detectPhysicsTopics,
  detectLanguageTopics,
} from "@/lib/atrin/education/engines/topics";
