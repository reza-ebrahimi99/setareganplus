import type { Metadata } from "next";
import { ExperienceJourneyScreen } from "@/components/portal/apps/ExperienceJourneyScreen";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import { loadExperienceHome } from "@/lib/sxp/hub/load-home";
import { assertSxpEnabledOrNotFound } from "@/lib/sxp/hub/require";

export const metadata: Metadata = {
  title: "خانه تجربه",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudentExperienceHomePage() {
  const context = await requireStudentPortalAccess();
  await assertSxpEnabledOrNotFound(context.organization.id);
  const home = await loadExperienceHome({
    context,
    timelineHref: "/portal/student/timeline",
  });
  return <ExperienceJourneyScreen home={home} />;
}
