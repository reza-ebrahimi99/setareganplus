/**
 * Guidance Platform — external candidate onboarding (identity intake).
 * Reached after portal OTP when a new Candidate account is provisioned.
 */

import { redirect } from "next/navigation";
import { GuidanceOnboardingForm } from "@/components/guidance/onboarding/GuidanceOnboardingForm";
import { candidateNeedsGuidanceOnboarding } from "@/lib/guidance/external-candidate";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { listHighSchoolMajorOptionsForForm } from "@/lib/guidance/onboarding-options";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { IRAN_PROVINCES } from "@/lib/registration/iran-locations";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

export default async function GuidanceOnboardingPage() {
  const context = await requireStudentPortalAccess();
  const guidanceOn = await isGuidanceEnabled(context.organization.id);
  if (!guidanceOn) {
    redirect("/portal/student");
  }

  const studentId = context.activeLink.studentId;
  if (!studentId) {
    redirect("/portal/select-account");
  }

  const needs = await candidateNeedsGuidanceOnboarding({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (!needs) {
    redirect("/portal/student/services/guidance");
  }

  const parsed = normalizeIranianMobile(context.user.mobile ?? "");
  if (!parsed.ok) {
    redirect("/portal/login");
  }

  const provinces = [...IRAN_PROVINCES];
  const majors = [...listHighSchoolMajorOptionsForForm()];

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:py-10" dir="rtl">
      <header className="mb-8">
        <p className="text-sm font-medium text-primary">سامانه جامع انتخاب رشته</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          تکمیل اطلاعات داوطلب
        </h1>
        <p className="mt-2 text-sm leading-7 text-muted">
          حساب شما ایجاد شد. این اطلاعات برای تشکیل پرونده هدایت تحصیلی لازم است
          و بدون دخالت ادمین ذخیره می‌شود.
        </p>
      </header>
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-[0_8px_24px_rgb(15_23_42_/_0.04)] sm:p-7">
        <GuidanceOnboardingForm
          mobile={parsed.normalized}
          provinces={provinces}
          majors={majors}
        />
      </div>
    </main>
  );
}
