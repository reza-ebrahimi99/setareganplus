/**
 * Guidance Platform — student dashboard home.
 * Presentation + lightweight view routing only.
 */

import { notFound, redirect } from "next/navigation";
import { GuidanceStudentDashboardPanels } from "@/components/guidance/office/GuidanceStudentDashboardPanels";
import { GuidanceUniversitiesHub } from "@/components/guidance/platform/GuidanceUniversitiesHub";
import { ensureGuidanceCase } from "@/lib/guidance/external-candidate";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { GUIDANCE_STEPS_ENTRY } from "@/lib/guidance/portal-nav";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/catalog";
import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import { loadOfficeDashboard } from "@/lib/guidance/office/dashboard";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

type GuidancePortalServicePageProps = {
  searchParams?: Promise<{ view?: string }>;
};

export default async function GuidancePortalServicePage({
  searchParams,
}: GuidancePortalServicePageProps) {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) {
    redirect("/portal/select-account");
  }

  const guidanceOn = await isGuidanceEnabled(context.organization.id);
  if (!guidanceOn) {
    notFound();
  }

  // Onboarding is no longer a prerequisite for the dashboard. ensureGuidanceCase
  // creates the case on first visit, so there is nothing to gate on and nothing
  // that can bounce the student back out to /onboarding.
  await ensureGuidanceCase({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
    flow: "guidance-dashboard",
  });

  const params = searchParams ? await searchParams : {};
  const view = params.view ?? "dashboard";

  if (view === "majors") {
    redirect("/discover/majors");
  }

  if (view === "plans") {
    redirect(guidanceJourneyV2StepPath(10));
  }

  if (view === "universities") {
    return <GuidanceUniversitiesHub />;
  }

  if (view === "appointments") {
    redirect("/portal/student/services/guidance");
  }

  const [model, plan] = await Promise.all([
    loadOfficeDashboard({
      organizationId: context.organization.id,
      userId: context.user.id,
      studentId,
    }),
    loadGuidanceJourneyPlan({
      organizationId: context.organization.id,
      userId: context.user.id,
      studentId,
    }),
  ]);
  // ensureGuidanceCase above guarantees a plan, so this is an unexpected state
  // rather than an onboarding one. notFound() keeps it loop-free.
  if (!model || !plan) {
    notFound();
  }

  return (
    <GuidanceStudentDashboardPanels
      model={model}
      userDisplayName={model.studentName}
      journeyContinueHref={GUIDANCE_STEPS_ENTRY}
    />
  );
}
