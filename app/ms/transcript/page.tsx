import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AtelierPage } from "@/components/guidance/office/AtelierPage";
import { GuidanceGradesUploadForm } from "@/components/guidance/GradesUploadForm";
import { GUIDANCE_ONBOARDING_PATH } from "@/lib/guidance/external-candidate";
import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import { loadFinalExamScores } from "@/lib/guidance/office/final-exam-store";
import { MAJOR_OFFICE_GRADES } from "@/lib/guidance/office/intake-href";
import { MAJOR_OFFICE_INTEREST } from "@/lib/guidance/office/nav";
import { loadGuidancePlanForPortalUser } from "@/lib/guidance/portal";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "آخرین قطعه از تصویر تحصیلی",
  robots: { index: false, follow: false },
};

export default async function OfficeTranscriptPage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) redirect("/portal/select-account");

  const plan = await loadGuidanceJourneyPlan({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (!plan) redirect(GUIDANCE_ONBOARDING_PATH);

  const [scores, portalPlan] = await Promise.all([
    loadFinalExamScores({
      organizationId: context.organization.id,
      planPublicId: plan.publicId,
      examGroup: plan.examGroup,
    }),
    loadGuidancePlanForPortalUser({
      organizationId: context.organization.id,
      userId: context.user.id,
      studentId,
    }),
  ]);

  if (!scores.summary.complete) {
    return (
      <AtelierPage
        kicker="اتاق سند"
        title="آخرین قطعه هنوز زود است"
        lead="اول توانایی‌ها را کامل کنید. کارنامه رسمی برای تطبیق روی میز مهندس است، نه برای شروع خالی."
        now="بازگشت به شناخت توانایی‌ها"
      >
        <div className="office-empty" role="status">
          <p>تصویر نمرات هنوز کامل نیست.</p>
          <Link href={MAJOR_OFFICE_GRADES} className="atelier-cta">
            ادامه شناخت توانایی‌ها
          </Link>
        </div>
      </AtelierPage>
    );
  }

  const latest = portalPlan?.latestFinalGrades ?? null;

  return (
    <AtelierPage
      kicker="اتاق سند"
      title="آخرین قطعه از تصویر تحصیلی شما"
      lead="فایل رسمی را بگذارید تا مهندس نمره‌هایی که نوشتید را با سند تطبیق دهد. این بارگذاری، پایان شناخت نیست — آغاز گفتگوست."
      now="بعد از سند: نگاه اول به شخصیت تحصیلی"
    >
      <GuidanceGradesUploadForm
        hasExisting={Boolean(latest)}
        existingFileName={latest?.originalFilename ?? null}
        existingVersion={latest?.versionNumber ?? null}
        acceptPdfOnly
        successHref={MAJOR_OFFICE_INTEREST}
        successLabel="ادامه: نگاه اول به شخصیت"
      />
    </AtelierPage>
  );
}
