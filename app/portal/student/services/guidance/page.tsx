/**
 * Guidance Platform — student dashboard home.
 * Presentation + lightweight view routing only.
 */

import { notFound, redirect } from "next/navigation";
import { GuidanceStudentDashboardPanels } from "@/components/guidance/office/GuidanceStudentDashboardPanels";
import { GuidanceUniversitiesHub } from "@/components/guidance/platform/GuidanceUniversitiesHub";
import {
  GUIDANCE_ONBOARDING_PATH,
  candidateNeedsGuidanceOnboarding,
  ensureGuidanceCase,
} from "@/lib/guidance/external-candidate";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { GUIDANCE_STEPS_ENTRY } from "@/lib/guidance/portal-nav";
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

  const needs = await candidateNeedsGuidanceOnboarding({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (needs) {
    redirect(GUIDANCE_ONBOARDING_PATH);
  }

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

  if (view === "universities") {
    return <GuidanceUniversitiesHub />;
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
  if (!model || !plan) {
    redirect(GUIDANCE_ONBOARDING_PATH);
  }

  return (
    <GuidanceStudentDashboardPanels
      model={model}
      userDisplayName={model.studentName}
      journeyContinueHref={GUIDANCE_STEPS_ENTRY}
    />
  );
}
