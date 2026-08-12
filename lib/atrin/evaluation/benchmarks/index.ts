/**
 * Benchmark suite layout:
 *   benchmarks/Grade1 … Grade12  (folder convention)
 *   benchmarks/dataset.ts        (aggregated fixtures)
 *
 * Subjects covered across grades:
 * Math, Science, Persian, English, Arabic, Chemistry, Physics,
 * Biology, Programming, Gifted, Konkur
 */

export {
  ATRIN_EDUCATION_BENCHMARKS,
  GRADE1,
  GRADE2,
  GRADE3,
  GRADE4,
  GRADE5,
  GRADE6,
  GRADE7,
  GRADE8,
  GRADE9,
  GRADE10,
  GRADE11,
  GRADE12,
} from "@/lib/atrin/evaluation/benchmarks/dataset";

export { GRADE1 as Grade1 } from "@/lib/atrin/evaluation/benchmarks/Grade1";
export { GRADE2 as Grade2 } from "@/lib/atrin/evaluation/benchmarks/Grade2";
export { GRADE3 as Grade3 } from "@/lib/atrin/evaluation/benchmarks/Grade3";
export { GRADE4 as Grade4 } from "@/lib/atrin/evaluation/benchmarks/Grade4";
export { GRADE5 as Grade5 } from "@/lib/atrin/evaluation/benchmarks/Grade5";
export { GRADE6 as Grade6 } from "@/lib/atrin/evaluation/benchmarks/Grade6";
export { GRADE7 as Grade7 } from "@/lib/atrin/evaluation/benchmarks/Grade7";
export { GRADE8 as Grade8 } from "@/lib/atrin/evaluation/benchmarks/Grade8";
export { GRADE9 as Grade9 } from "@/lib/atrin/evaluation/benchmarks/Grade9";
export { GRADE10 as Grade10 } from "@/lib/atrin/evaluation/benchmarks/Grade10";
export { GRADE11 as Grade11 } from "@/lib/atrin/evaluation/benchmarks/Grade11";
export { GRADE12 as Grade12 } from "@/lib/atrin/evaluation/benchmarks/Grade12";

import type { EvaluationBenchmarkItem } from "@/lib/atrin/evaluation/types";
import { ATRIN_EDUCATION_BENCHMARKS } from "@/lib/atrin/evaluation/benchmarks/dataset";

export function listBenchmarksByGrade(
  gradeFolder: EvaluationBenchmarkItem["gradeFolder"],
): EvaluationBenchmarkItem[] {
  return ATRIN_EDUCATION_BENCHMARKS.filter((b) => b.gradeFolder === gradeFolder);
}

export function listBenchmarksBySubject(
  subjectFolder: EvaluationBenchmarkItem["subjectFolder"],
): EvaluationBenchmarkItem[] {
  return ATRIN_EDUCATION_BENCHMARKS.filter(
    (b) => b.subjectFolder === subjectFolder,
  );
}
