/**
 * Guidance ERP — portal final grades upload page.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-primary">بارگذاری کارنامه</h1>
        <p className="text-sm leading-7 text-muted">
          کارنامه نهایی را به‌صورت خصوصی بارگذاری کنید. پس از ارسال، وضعیت «در
          انتظار بررسی» نمایش داده می‌شود.
        </p>
        <Link
          href="/portal/student/services/guidance"
          className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          بازگشت به مسیر
        </Link>
      </header>

      {plan.latestFinalGrades?.verificationStatus === "PENDING" ? (
        <div className="rounded-2xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm leading-7 text-primary">
          کارنامه شما دریافت شد.
          <br />
          در انتظار بررسی...
        </div>
      ) : null}

      <GuidanceGradesUploadForm hasExisting={Boolean(plan.latestFinalGrades)} />
    </div>
  );
}
