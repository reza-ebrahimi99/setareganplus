import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChamberEmpty } from "@/components/guidance/office/ChamberScene";
import { ChamberPage } from "@/components/guidance/office/ChamberPage";
import { SealMark, UnfinishedMark } from "@/components/guidance/office/illustrations";
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
      <ChamberPage
        kicker="اتاق سند"
        title="آخرین قطعه هنوز زود است"
        lead="مهر سند وقتی باز می‌شود که توانایی‌ها کامل روی میز نشسته باشند."
        art={<UnfinishedMark />}
        artCaption="صورت‌فلکی ناتمام"
      >
        <ChamberEmpty
          title="مهر هنوز بسته است"
          body="عجله‌ای نیست. اول نمره‌ها."
          action={
            <Link href={MAJOR_OFFICE_GRADES} className="chamber-go">
              ادامه شناخت توانایی‌ها
            </Link>
          }
        />
      </ChamberPage>
    );
  }

  const latest = portalPlan?.latestFinalGrades ?? null;

  return (
    <ChamberPage
      kicker="اتاق سند"
      title="آخرین قطعه از تصویر تحصیلی شما"
      lead="فایل رسمی را بگذارید تا مهندس نمره‌ها را با سند تطبیق دهد."
      art={<SealMark />}
      artCaption="مهر طلایی"
    >
      <GuidanceGradesUploadForm
        hasExisting={Boolean(latest)}
        existingFileName={latest?.originalFilename ?? null}
        existingVersion={latest?.versionNumber ?? null}
        acceptPdfOnly
        successHref={MAJOR_OFFICE_INTEREST}
        successLabel="ادامه: نگاه اول به شخصیت"
      />
    </ChamberPage>
  );
}
