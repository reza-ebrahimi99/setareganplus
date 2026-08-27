import type { Metadata } from "next";
import { ExperienceHomeView } from "@/components/sxp/ExperienceHomeView";
import { requireGuardianPortalAccess } from "@/lib/portal/auth";
import { loadExperienceHome } from "@/lib/sxp/hub/load-home";
import { assertSxpEnabledOrNotFound } from "@/lib/sxp/hub/require";

export const metadata: Metadata = {
  title: "خانه تجربه",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ParentExperienceHomePage() {
  const context = await requireGuardianPortalAccess();
  await assertSxpEnabledOrNotFound(context.organization.id);
  const home = await loadExperienceHome({
    context,
    timelineHref: "/portal/parent/timeline",
  });
  return <ExperienceHomeView home={home} />;
}
