import { PortalAccountType } from "@/generated/prisma/enums";
import { handleExperienceTimelineFeed } from "@/lib/sxp/hub/timeline-feed";
import { SXP_PARENT_PATHS } from "@/lib/sxp/hub/paths";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleExperienceTimelineFeed({
    request,
    accountType: PortalAccountType.GUARDIAN,
    feedHref: SXP_PARENT_PATHS.timelineFeed,
  });
}
