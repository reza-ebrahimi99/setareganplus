import type { Metadata } from "next";
import Link from "next/link";
import { AssessmentResultsDashboard } from "@/components/guidance/office/assessment/AssessmentResultsDashboard";
import { loadOfficeInterestResults } from "@/lib/guidance/office/interest-report-loader";
import { requireOfficeGuidancePlan } from "@/lib/guidance/office/interest-access";
import { MAJOR_OFFICE_INTEREST } from "@/lib/guidance/office/nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "نتیجه آزمون رغبت",
  robots: { index: false, follow: false },
};

export default async function OfficeInterestResultsPage() {
  const { context, plan } = await requireOfficeGuidancePlan();
  const view = await loadOfficeInterestResults({
    organizationId: context.organization.id,
    plan,
  });

  if (!view) {
    return (
      <div className="office-assess">
        <header className="office-assess__hero">
          <p>نتیجه آزمون</p>
          <h1>هنوز نتیجه کاملی ثبت نشده</h1>
          <p>آزمون را ادامه دهید تا گزارش خانواده باز شود.</p>
        </header>
        <Link href={MAJOR_OFFICE_INTEREST} className="office-assess__cta">
          ادامه آزمون رغبت
        </Link>
      </div>
    );
  }

  return <AssessmentResultsDashboard model={view.dashboard} view={view} />;
}
