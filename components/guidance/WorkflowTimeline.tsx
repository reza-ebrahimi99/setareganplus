/**
 * Guidance ERP — portal workflow timeline presentation.
 * Thin adapter over the generic Portal Journey system (Phase 3).
 */

import { PortalJourneyTrack } from "@/components/portal/journey/PortalJourneyTrack";
import { mapGuidanceStepsToJourney } from "@/lib/guidance/journey-presentation";
import type { GuidanceTimelineStep } from "@/lib/guidance/timeline";

type GuidanceWorkflowTimelineProps = {
  steps: readonly GuidanceTimelineStep[];
};

/** @deprecated Prefer PortalJourneyScreen for full journey chrome. */
export function GuidanceWorkflowTimeline({
  steps,
}: GuidanceWorkflowTimelineProps) {
  return <PortalJourneyTrack steps={mapGuidanceStepsToJourney(steps)} />;
}
