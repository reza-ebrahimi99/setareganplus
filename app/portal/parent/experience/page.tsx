import type { Metadata } from "next";
import { ExperienceHomeView } from "@/components/sxp/ExperienceHomeView";
import { requireGuardianPortalAccess } from "@/lib/portal/auth";
import { loadExperienceHome } from "@/lib/sxp/hub/load-home";
import { SXP_PARENT_PATHS } from "@/lib/sxp/hub/paths";
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
    timelineHref: SXP_PARENT_PATHS.timeline,
    cardHref: SXP_PARENT_PATHS.card,
    filesHref: SXP_PARENT_PATHS.files,
  });
  return <ExperienceHomeView home={home} />;
}
