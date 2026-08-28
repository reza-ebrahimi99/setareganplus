import type { Metadata } from "next";
import { ExperienceTimelineView } from "@/components/sxp/ExperienceTimelineView";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import { loadExperienceTimeline } from "@/lib/sxp/hub/load-timeline";
import { assertSxpEnabledOrNotFound } from "@/lib/sxp/hub/require";

export const metadata: Metadata = {
  title: "روند",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudentExperienceTimelinePage() {
  const context = await requireStudentPortalAccess();
  await assertSxpEnabledOrNotFound(context.organization.id);
  const timeline = await loadExperienceTimeline(context);
  return <ExperienceTimelineView timeline={timeline} />;
}
