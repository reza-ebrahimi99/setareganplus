/**
 * Guidance ERP — portal final grades upload page (premium presentation).
 */

import { notFound, redirect } from "next/navigation";
import { ChamberEmpty } from "@/components/guidance/office/ChamberScene";
import { ChamberPage } from "@/components/guidance/office/ChamberPage";
import { SealMark } from "@/components/guidance/office/illustrations";
import { GuidanceGradesUploadForm } from "@/components/guidance/GradesUploadForm";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { loadGuidancePlanForPortalUser } from "@/lib/guidance/portal";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

export default async function GuidanceGradesUploadPage() {
  const context = await requireStudentPortalAccess();
  const enabled = await isGuidanceEnabled(context.organization.id);
  if (!enabled) {
    notFound();
  }

  const studentId = context.activeLink.studentId;
  if (!studentId) {
    redirect("/portal/select-account");
  }

  const plan = await loadGuidancePlanForPortalUser({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });

  if (!plan) {
    redirect("/guidance/pre-register");
  }

  const pendingReview =
    plan.latestFinalGrades?.verificationStatus === "PENDING";

  return (
    <ChamberPage
      kicker="اتاق سند"
      title="کارنامه نهایی"
      lead="فایل رسمی را بگذارید تا مهندس نمره‌ها را با سند تطبیق دهد."
      art={<SealMark />}
      artCaption="مهر"
    >
      {pendingReview ? (
        <ChamberEmpty
          title="سند روی میز مشاور است"
          body="نسخه فعلی در انتظار بررسی است. بارگذاری تازه به‌عنوان نسخه جدید ثبت می‌شود."
        />
      ) : null}

      <GuidanceGradesUploadForm
        hasExisting={Boolean(plan.latestFinalGrades)}
        existingFileName={plan.latestFinalGrades?.originalFilename ?? null}
        existingVersion={plan.latestFinalGrades?.versionNumber ?? null}
      />
    </ChamberPage>
  );
}
