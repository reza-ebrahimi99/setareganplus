import type { Metadata } from "next";
import { ExperienceHomeView } from "@/components/sxp/ExperienceHomeView";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import { loadExperienceHome } from "@/lib/sxp/hub/load-home";
import { SXP_STUDENT_PATHS } from "@/lib/sxp/hub/paths";
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
    timelineHref: SXP_STUDENT_PATHS.timeline,
    cardHref: SXP_STUDENT_PATHS.card,
    filesHref: SXP_STUDENT_PATHS.files,
  });
  return <ExperienceHomeView home={home} />;
}
