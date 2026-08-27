import { PortalAccountType } from "@/generated/prisma/enums";
import { handleExperienceTimelineFeed } from "@/lib/sxp/hub/timeline-feed";
import { SXP_STUDENT_PATHS } from "@/lib/sxp/hub/paths";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleExperienceTimelineFeed({
    request,
    accountType: PortalAccountType.STUDENT,
    feedHref: SXP_STUDENT_PATHS.timelineFeed,
  });
}
