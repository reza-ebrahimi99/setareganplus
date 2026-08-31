import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OfficeInterestExperience } from "@/components/guidance/office/assessment/OfficeInterestExperience";
import { isAssessmentComplete } from "@/lib/guidance/journey/assessment/scoring";
import { loadGuidanceStep2Session } from "@/lib/guidance/journey/steps/step2-interest-assessment";
import { requireOfficeGuidancePlan } from "@/lib/guidance/office/interest-access";
import { MAJOR_OFFICE_INTEREST_RESULTS } from "@/lib/guidance/office/nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "آزمون رغبت رایگان",
  robots: { index: false, follow: false },
};

export default async function OfficeInterestPage() {
  const { context, plan } = await requireOfficeGuidancePlan();
  const session = await loadGuidanceStep2Session({
    organizationId: context.organization.id,
    planPublicId: plan.publicId,
  });

  if (session.result && isAssessmentComplete(session.answers)) {
    redirect(MAJOR_OFFICE_INTEREST_RESULTS);
  }

  return (
    <OfficeInterestExperience
      initialAnswers={session.answers}
      initialSectionId={session.currentSectionId ?? null}
    />
  );
}
