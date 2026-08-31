import { notFound, redirect } from "next/navigation";
import { GUIDANCE_ONBOARDING_PATH } from "@/lib/guidance/external-candidate";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import type { GuidanceJourneyPlanSnapshot } from "@/lib/guidance/journey/types";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import type { PortalContext } from "@/lib/portal/auth/types";

export async function requireOfficeGuidancePlan(): Promise<{
  context: PortalContext;
  plan: GuidanceJourneyPlanSnapshot;
  studentId: string;
}> {
  const context = await requireStudentPortalAccess();
  const enabled = await isGuidanceEnabled(context.organization.id);
  if (!enabled) notFound();

  const studentId = context.activeLink.studentId;
  if (!studentId) redirect("/portal/select-account");

  const plan = await loadGuidanceJourneyPlan({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (!plan) redirect(GUIDANCE_ONBOARDING_PATH);

  return { context, plan, studentId };
}
