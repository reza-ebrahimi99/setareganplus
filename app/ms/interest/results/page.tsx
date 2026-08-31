import type { Metadata } from "next";
import Link from "next/link";
import { AssessmentResultsDashboard } from "@/components/guidance/office/assessment/AssessmentResultsDashboard";
import {
  buildAssessmentDashboard,
  isAssessmentComplete,
} from "@/lib/guidance/journey/assessment/scoring";
import { loadGuidanceStep2Session } from "@/lib/guidance/journey/steps/step2-interest-assessment";
import { requireOfficeGuidancePlan } from "@/lib/guidance/office/interest-access";
import { MAJOR_OFFICE_INTEREST } from "@/lib/guidance/office/nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "نتیجه آزمون رغبت",
  robots: { index: false, follow: false },
};

export default async function OfficeInterestResultsPage() {
  const { context, plan } = await requireOfficeGuidancePlan();
  const session = await loadGuidanceStep2Session({
    organizationId: context.organization.id,
    planPublicId: plan.publicId,
  });

  if (!session.result || !isAssessmentComplete(session.answers)) {
    return (
      <div className="office-assess">
        <header className="office-assess__hero">
          <p>نتیجه آزمون</p>
          <h1>هنوز نتیجه کاملی ثبت نشده</h1>
          <p>آزمون را ادامه دهید تا داشبورد نتیجه باز شود.</p>
        </header>
        <Link href={MAJOR_OFFICE_INTEREST} className="office-assess__cta">
          ادامه آزمون رغبت
        </Link>
      </div>
    );
  }

  const model = buildAssessmentDashboard(session.answers, session.result);
  return <AssessmentResultsDashboard model={model} />;
}
