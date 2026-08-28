import { ExperienceTimelineVisibility } from "@/generated/prisma/enums";

const HUB_VISIBLE = new Set<ExperienceTimelineVisibility>([
  ExperienceTimelineVisibility.SELF,
  ExperienceTimelineVisibility.GUARDIANS,
]);

export function isHubVisibleTimeline(
  visibility: ExperienceTimelineVisibility,
): boolean {
  return HUB_VISIBLE.has(visibility);
}

/**
 * S1: a portal viewer only reads their own userId projections.
 * Guardian-of-child fan-out is deferred (S3+).
 */
export function timelineViewerFilter(input: {
  viewerUserId: string;
  rowUserId: string;
  visibility: ExperienceTimelineVisibility;
}): boolean {
  if (input.rowUserId !== input.viewerUserId) return false;
  return isHubVisibleTimeline(input.visibility);
}
