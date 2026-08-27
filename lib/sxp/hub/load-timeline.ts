import { ExperienceTimelineVisibility } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { SXP_TIMELINE_PAGE_SIZE } from "@/lib/sxp/constants";
import { ensureExperienceProfile } from "@/lib/sxp/profile";
import type { PortalContext } from "@/lib/portal/auth/types";

export type ExperienceTimelineDto = {
  displayName: string;
  items: Array<{
    id: string;
    title: string;
    summary: string | null;
    occurredAt: Date;
    eventType: string;
  }>;
};

export async function loadExperienceTimeline(
  context: PortalContext,
): Promise<ExperienceTimelineDto> {
  const profile = await ensureExperienceProfile({
    organizationId: context.organization.id,
    userId: context.user.id,
    displayName: context.user.displayName,
  });

  const items = await prisma.experienceTimelineEvent.findMany({
    where: {
      organizationId: context.organization.id,
      userId: context.user.id,
      visibility: {
        in: [
          ExperienceTimelineVisibility.SELF,
          ExperienceTimelineVisibility.GUARDIANS,
        ],
      },
    },
    orderBy: { occurredAt: "desc" },
    take: SXP_TIMELINE_PAGE_SIZE,
    select: {
      id: true,
      title: true,
      summary: true,
      occurredAt: true,
      eventType: true,
    },
  });

  return {
    displayName: profile.displayName ?? context.user.displayName,
    items,
  };
}
