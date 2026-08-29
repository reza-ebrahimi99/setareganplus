/**
 * Guidance ERP — portal student service home (Journey experience).
 */

import { notFound, redirect } from "next/navigation";
import { PortalJourneyHeroBanner } from "@/components/portal/journey/PortalJourneyHero";
import { PortalJourneyScreen } from "@/components/portal/journey/PortalJourneyScreen";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import {
  buildGuidanceEmptyJourneyHero,
  buildGuidanceJourneyModel,
} from "@/lib/guidance/journey-presentation";
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
      <div className="portal-journey portal-journey--empty">
        <PortalJourneyHeroBanner hero={buildGuidanceEmptyJourneyHero()} />
      </div>
    );
  }

  const steps = buildGuidancePortalTimeline(plan);
  const model = buildGuidanceJourneyModel({
    steps,
    publicId: plan.publicId,
  });

  return <PortalJourneyScreen model={model} />;
}
