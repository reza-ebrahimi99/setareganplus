import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
  title: "کارنامه رسمی",
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
      <div className="office-intake-page">
        <header>
          <p>گام ۴ از مسیر مشاوره</p>
          <h1>بارگذاری کارنامه رسمی</h1>
          <p>
            ابتدا همه نمرات امتحان نهایی را وارد کنید تا فایل PDF برای مقایسه
            مشاور باز شود.
          </p>
        </header>
        <div className="office-empty" role="status">
          <p>نمرات هنوز کامل نیست.</p>
          <Link href={MAJOR_OFFICE_GRADES} className="office-intake__continue">
            بازگشت به ورود نمرات
          </Link>
        </div>
      </div>
    );
  }

  const latest = portalPlan?.latestFinalGrades ?? null;

  return (
    <div className="office-intake-page">
      <header>
        <p>گام ۴ از مسیر مشاوره</p>
        <h1>بارگذاری کارنامه رسمی PDF</h1>
        <p>
          فایل رسمی کارنامه را بعد از ورود نمرات بارگذاری کنید تا مشاور بتواند
          نمرات واردشده را با سند تطبیق دهد.
        </p>
      </header>
      <GuidanceGradesUploadForm
        hasExisting={Boolean(latest)}
        existingFileName={latest?.originalFilename ?? null}
        existingVersion={latest?.versionNumber ?? null}
        acceptPdfOnly
        successHref={MAJOR_OFFICE_INTEREST}
        successLabel="ادامه: آزمون رغبت"
      />
    </div>
  );
}
