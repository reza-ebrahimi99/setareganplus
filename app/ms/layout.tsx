import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { MajorOfficeShell } from "@/components/guidance/office/MajorOfficeShell";
import {
  GUIDANCE_ONBOARDING_PATH,
  candidateNeedsGuidanceOnboarding,
} from "@/lib/guidance/external-candidate";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import {
  MAJOR_OFFICE_HOME,
  MAJOR_OFFICE_INTEREST,
  MAJOR_OFFICE_JOURNEY,
  MAJOR_OFFICE_SESSION,
  resolveOfficeRailSections,
} from "@/lib/guidance/office/nav";
import {
  MAJOR_OFFICE_ACADEMIC,
  MAJOR_OFFICE_GRADES,
  MAJOR_OFFICE_IDENTITY,
  MAJOR_OFFICE_TRANSCRIPT,
} from "@/lib/guidance/office/intake-href";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

export default async function MajorOfficeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const context = await requireStudentPortalAccess();
  const enabled = await isGuidanceEnabled(context.organization.id);
  if (!enabled) notFound();

  const studentId = context.activeLink.studentId;
  if (!studentId) {
    redirect("/portal/select-account");
  }

  const needs = await candidateNeedsGuidanceOnboarding({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (needs) {
    redirect(GUIDANCE_ONBOARDING_PATH);
  }

  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? MAJOR_OFFICE_HOME;

  const plan = await loadGuidanceJourneyPlan({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  const rail = resolveOfficeRailSections(
    plan
      ? {
          currentStep: plan.currentStep,
          completedSteps: plan.completedSteps,
          finalApproved: Boolean(plan.finalApprovedAtIso),
        }
      : null,
  );
  const onJourney =
    pathname === MAJOR_OFFICE_JOURNEY || pathname.startsWith(`${MAJOR_OFFICE_JOURNEY}/`);
  const onInterest = pathname === MAJOR_OFFICE_INTEREST || pathname.startsWith(`${MAJOR_OFFICE_INTEREST}/`);
  const onSession = pathname === MAJOR_OFFICE_SESSION || pathname.startsWith(`${MAJOR_OFFICE_SESSION}/`);
  const statusLabel =
    pathname === MAJOR_OFFICE_IDENTITY
      ? "کی هستید"
      : pathname === MAJOR_OFFICE_ACADEMIC
        ? "تصویر تحصیلی"
        : pathname === MAJOR_OFFICE_GRADES
          ? "توانایی‌های شما"
          : pathname === MAJOR_OFFICE_TRANSCRIPT
            ? "آخرین قطعه تصویر"
            : onSession
              ? "نخستین گفتگو"
              : onInterest
                ? "نگاه اول به شخصیت"
                : onJourney
                  ? "مسیر همراهی"
                  : "دفتر شما";

  return (
    <MajorOfficeShell
      userDisplayName={context.user.displayName}
      statusLabel={statusLabel}
      pathname={pathname}
      rail={rail}
    >
      {children}
    </MajorOfficeShell>
  );
}
