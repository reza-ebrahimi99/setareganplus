/**
 * Guidance ERP — portal final grades upload page (premium presentation).
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GuidanceGradesUploadForm } from "@/components/guidance/GradesUploadForm";
import { PortalIcon } from "@/components/portal/icons";
import { PortalSurface } from "@/components/portal/PortalSurface";
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
    <div className="portal-upload-page">
      <header className="portal-upload-page__header" data-portal-accent="teal">
        <Link
          href="/portal/student/services/guidance"
          className="portal-upload-page__back"
        >
          <PortalIcon name="route" className="size-4" />
          بازگشت به مسیر
        </Link>
        <h1 className="portal-upload-page__title">بارگذاری کارنامه</h1>
        <p className="portal-upload-page__support">
          کارنامه نهایی را خصوصی بارگذاری کن. پس از ارسال، وضعیت «در انتظار
          بررسی» نمایش داده می‌شود.
        </p>
      </header>

      {pendingReview ? (
        <PortalSurface accent="orange" padding="md" className="portal-upload-waiting">
          <p className="portal-upload-waiting__title">کارنامه شما دریافت شد</p>
          <p className="portal-upload-waiting__support">در انتظار بررسی...</p>
          <Link
            href="/portal/student/services/guidance"
            className="portal-upload-waiting__cta"
          >
            مشاهده مرکز تحلیل اولیه
          </Link>
        </PortalSurface>
      ) : null}

      <GuidanceGradesUploadForm
        hasExisting={Boolean(plan.latestFinalGrades)}
        existingFileName={plan.latestFinalGrades?.originalFilename ?? null}
        existingVersion={plan.latestFinalGrades?.versionNumber ?? null}
      />
    </div>
  );
}
