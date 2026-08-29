/**
 * Guidance ERP — portal student service home (workflow timeline).
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GuidanceWorkflowTimeline } from "@/components/guidance/WorkflowTimeline";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { loadGuidancePlanForPortalUser } from "@/lib/guidance/portal";
import { buildGuidancePortalTimeline } from "@/lib/guidance/timeline";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

export default async function GuidancePortalServicePage() {
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
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-xl font-semibold text-primary">
          سامانه جامع انتخاب رشته
        </h1>
        <p className="text-sm leading-7 text-muted">
          هنوز پرونده‌ای برای شما تشکیل نشده است. از مسیر پیش‌ثبت‌نام عمومی شروع
          کنید.
        </p>
        <Link
          href="/guidance/pre-register"
          className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
        >
          شروع پیش‌ثبت‌نام
        </Link>
      </div>
    );
  }

  const steps = buildGuidancePortalTimeline(plan);
  const pendingReview =
    plan.latestFinalGrades?.verificationStatus === "PENDING";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-primary sm:text-2xl">
          مسیر انتخاب رشته
        </h1>
        <p className="text-sm leading-7 text-muted">
          وضعیت پرونده و گام‌های بعدی را اینجا دنبال کنید.
        </p>
        <p className="text-xs text-muted" dir="ltr">
          plan: {plan.publicId}
        </p>
      </header>

      {pendingReview ? (
        <div className="rounded-2xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm leading-7 text-primary">
          کارنامه شما دریافت شد.
          <br />
          در انتظار بررسی...
        </div>
      ) : null}

      <GuidanceWorkflowTimeline steps={steps} />
    </div>
  );
}
