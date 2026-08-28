/**
 * Atrin Evaluation Engine
 * Question → Education Engine → Evaluation → Quality Score → Suggestions
 * Local analytics + benchmark runner (no backend).
 */

export type * from "@/lib/atrin/evaluation/types";
export {
  ATRIN_EDUCATION_BENCHMARKS,
  listBenchmarksByGrade,
  listBenchmarksBySubject,
} from "@/lib/atrin/evaluation/benchmarks/index";
export { evaluateEducationResponse } from "@/lib/atrin/evaluation/evaluate";
export {
  runEducationEvaluationSuite,
  formatEvaluationReport,
} from "@/lib/atrin/evaluation/runner";
export {
  loadEvaluationAnalytics,
  saveEvaluationAnalytics,
  trackEducationUsage,
  recordEvaluationSuite,
} from "@/lib/atrin/evaluation/analytics";
