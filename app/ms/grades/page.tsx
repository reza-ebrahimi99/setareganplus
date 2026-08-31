import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AtelierPage } from "@/components/guidance/office/AtelierPage";
import { ScoresMark } from "@/components/guidance/office/illustrations";
import { FinalExamForm } from "@/components/guidance/office/FinalExamForm";
import { GUIDANCE_ONBOARDING_PATH } from "@/lib/guidance/external-candidate";
import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import { loadFinalExamScores } from "@/lib/guidance/office/final-exam-store";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "شناخت توانایی‌های شما",
  robots: { index: false, follow: false },
};

export default async function OfficeGradesPage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) redirect("/portal/select-account");

  const plan = await loadGuidanceJourneyPlan({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (!plan) redirect(GUIDANCE_ONBOARDING_PATH);

  const stored = await loadFinalExamScores({
    organizationId: context.organization.id,
    planPublicId: plan.publicId,
    examGroup: plan.examGroup,
  });

  return (
    <AtelierPage
      kicker="اتاق توانایی‌ها"
      title="شناخت توانایی‌های شما"
      lead="هر درس یک قطعه است، نه یک ردیف فرم. نمره را بنویسید و بروید؛ معدل خودش شکل می‌گیرد. سند PDF بعد از کامل شدن تصویر باز می‌شود."
      now="پس از نمرات، آخرین قطعه تصویر تحصیلی"
      art={<ScoresMark />}
      artCaption="نقشه توانایی‌ها"
    >
      <FinalExamForm examGroup={plan.examGroup} initialScores={stored.scores} />
    </AtelierPage>
  );
}
