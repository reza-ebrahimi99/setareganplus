import Link from "next/link";
import { AssessmentResultCard } from "@/components/assessments/AssessmentResultCard";
import type { PublicAssessmentResultCard } from "@/lib/assessment/results";

type StudentAssessmentHistorySectionProps = {
  results: PublicAssessmentResultCard[];
  studentName: string;
};

export function StudentAssessmentHistorySection({
  results,
  studentName,
}: StudentAssessmentHistorySectionProps) {
  if (results.length === 0) return null;

  return (
    <section
      aria-labelledby="student-assessment-history-heading"
      className="admin-card space-y-5 p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="student-assessment-history-heading"
            className="text-xl font-bold text-primary"
          >
            تاریخچه آزمون
          </h2>
          <p className="mt-1 text-sm text-muted">
            نتایج منتشرشده {studentName}، از جدید به قدیم
          </p>
        </div>
        <Link href="/assessments" className="text-sm text-primary underline">
          همه آزمون‌ها
        </Link>
      </div>
      <div className="space-y-4">
        {results.map((result) => (
          <AssessmentResultCard
            key={result.id}
            result={result}
            showStudent={false}
          />
        ))}
      </div>
    </section>
  );
}
