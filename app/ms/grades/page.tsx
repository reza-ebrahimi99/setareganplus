import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FinalExamForm } from "@/components/guidance/office/FinalExamForm";
import { GUIDANCE_ONBOARDING_PATH } from "@/lib/guidance/external-candidate";
import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import { loadFinalExamScores } from "@/lib/guidance/office/final-exam-store";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "نمرات امتحان نهایی",
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
    <div className="office-intake-page">
      <header>
        <p>گام ۳ از مسیر مشاوره</p>
        <h1>نمرات امتحان نهایی</h1>
        <p>
          نمره هر درس را جداگانه وارد کنید. معدل خودکار محاسبه می‌شود و می‌توانید
          بعداً برگردید. کارنامه PDF بعد از تکمیل نمرات باز می‌شود.
        </p>
      </header>
      <FinalExamForm examGroup={plan.examGroup} initialScores={stored.scores} />
    </div>
  );
}
