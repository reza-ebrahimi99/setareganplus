import type { Metadata } from "next";
import { ExperienceTimelineView } from "@/components/sxp/ExperienceTimelineView";
import { requireGuardianPortalAccess } from "@/lib/portal/auth";
import { loadExperienceTimeline } from "@/lib/sxp/hub/load-timeline";
import { SXP_PARENT_PATHS } from "@/lib/sxp/hub/paths";
import { assertSxpEnabledOrNotFound } from "@/lib/sxp/hub/require";

export const metadata: Metadata = {
  title: "روند",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string; type?: string; cursor?: string }>;
};

export default async function ParentExperienceTimelinePage({
  searchParams,
}: PageProps) {
  const context = await requireGuardianPortalAccess();
  await assertSxpEnabledOrNotFound(context.organization.id);
  const params = await searchParams;
  const timeline = await loadExperienceTimeline({
    context,
    feedHref: SXP_PARENT_PATHS.timelineFeed,
    q: params.q,
    type: params.type,
    cursor: params.cursor,
  });
  return <ExperienceTimelineView timeline={timeline} />;
}
