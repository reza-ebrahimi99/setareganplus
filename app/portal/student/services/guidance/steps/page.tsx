import { notFound, redirect } from "next/navigation";

import { GUIDANCE_CANONICAL_DASHBOARD } from "@/lib/guidance/canonical-entry";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/catalog";
import { loadGuidanceV2Plan } from "@/lib/guidance/journey-v2/plan";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

export default async function GuidanceJourneyStepsIndexPage() {
  const context = await requireStudentPortalAccess();

  const enabled = await isGuidanceEnabled(context.organization.id);
  if (!enabled) {
    notFound();
  }

  const studentId = context.activeLink.studentId;
  if (!studentId) {
    redirect("/portal/select-account");
  }

  const plan = await loadGuidanceV2Plan({
    organizationId: context.organization.id,
    studentId,
    userId: context.user.id,
  });

  if (!plan) {
    redirect(GUIDANCE_CANONICAL_DASHBOARD);
  }

  redirect(guidanceJourneyV2StepPath(plan.currentStep));
}
