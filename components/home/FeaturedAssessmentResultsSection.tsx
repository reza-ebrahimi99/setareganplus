import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AssessmentResultCard } from "@/components/assessments/AssessmentResultCard";
import { loadFeaturedAssessmentResults } from "@/lib/assessment/results";

/**
 * Reusable homepage strip for featured assessment results.
 * Not mounted on `/` yet — import when ready for launch.
 */
export async function FeaturedAssessmentResultsSection() {
  const results = await loadFeaturedAssessmentResults();
  if (results.length === 0) return null;

  return (
    <section
      aria-labelledby="featured-assessment-results-heading"
      className="border-y border-border/60 bg-gradient-to-b from-background via-surface to-background py-14 sm:py-16"
    >
      <Container>
        <SectionHeader
          eyebrow="مؤسسه علمی ستارگان"
          heading="نتایج برجسته آزمون"
          description="نمونه‌ای از نتایج ویژه دانش‌آموزان در آزمون‌های مؤسسه و مراکز همکار."
          headingId="featured-assessment-results-heading"
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((result) => (
            <AssessmentResultCard key={result.id} result={result} />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/assessments"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary/92 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            مشاهده همه آزمون‌ها
          </Link>
        </div>
      </Container>
    </section>
  );
}
