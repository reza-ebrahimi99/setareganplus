import { Prisma } from "@/generated/prisma/client";
import { ExperienceTimelineVisibility } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { SXP_TIMELINE_PAGE_SIZE } from "@/lib/sxp/constants";
import { relativeTimeFa, groupTimelineByTehranDay } from "@/lib/sxp/engine/timeline-group";
import {
  decodeTimelineCursor,
  encodeTimelineCursor,
  parseTimelineTypeFilter,
  timelineTypeFilterToPrefix,
  type TimelineDayGroup,
  type TimelineTypeFilter,
} from "@/lib/sxp/engine/timeline-query";
import { ensureExperienceProfile } from "@/lib/sxp/profile";
import type { PortalContext } from "@/lib/portal/auth/types";

export type ExperienceTimelineItemDto = {
  id: string;
  title: string;
  summary: string | null;
  occurredAt: string;
  eventType: string;
  relativeTime: string;
};

export type ExperienceTimelineDto = {
  displayName: string;
  query: string;
  type: TimelineTypeFilter;
  groups: TimelineDayGroup<ExperienceTimelineItemDto>[];
  nextCursor: string | null;
  feedHref: string;
};

function buildSearchFilter(query: string): Prisma.ExperienceTimelineEventWhereInput | null {
  const needle = query.trim();
  if (!needle) return null;
  return {
    OR: [
      { title: { contains: needle } },
      { summary: { contains: needle } },
    ],
  };
}

export async function loadExperienceTimeline(params: {
  context: PortalContext;
  feedHref: string;
  q?: string | null;
  type?: string | null;
  cursor?: string | null;
}): Promise<ExperienceTimelineDto> {
  const { context, feedHref } = params;
  const query = (params.q ?? "").trim();
  const type = parseTimelineTypeFilter(params.type);
  const prefix = timelineTypeFilterToPrefix(type);
  const cursor = decodeTimelineCursor(params.cursor);

  const profile = await ensureExperienceProfile({
    organizationId: context.organization.id,
    userId: context.user.id,
    displayName: context.user.displayName,
  });

  const searchFilter = buildSearchFilter(query);
  const cursorFilter: Prisma.ExperienceTimelineEventWhereInput | null = cursor
    ? {
        OR: [
          { occurredAt: { lt: cursor.occurredAt } },
          {
            AND: [{ occurredAt: cursor.occurredAt }, { id: { lt: cursor.id } }],
          },
        ],
      }
    : null;

  const where: Prisma.ExperienceTimelineEventWhereInput = {
    organizationId: context.organization.id,
    userId: context.user.id,
    visibility: {
      in: [
        ExperienceTimelineVisibility.SELF,
        ExperienceTimelineVisibility.GUARDIANS,
      ],
    },
    ...(prefix ? { eventType: { startsWith: prefix } } : {}),
    AND: [searchFilter, cursorFilter].filter(
      (value): value is Prisma.ExperienceTimelineEventWhereInput => value != null,
    ),
  };

  const rows = await prisma.experienceTimelineEvent.findMany({
    where,
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: SXP_TIMELINE_PAGE_SIZE + 1,
    select: {
      id: true,
      title: true,
      summary: true,
      occurredAt: true,
      eventType: true,
    },
  });

  const hasMore = rows.length > SXP_TIMELINE_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, SXP_TIMELINE_PAGE_SIZE) : rows;
  const now = new Date();
  const items: ExperienceTimelineItemDto[] = page.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    occurredAt: item.occurredAt.toISOString(),
    eventType: item.eventType,
    relativeTime: relativeTimeFa(item.occurredAt, now),
  }));

  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeTimelineCursor({
          occurredAt: new Date(last.occurredAt),
          id: last.id,
        })
      : null;

  return {
    displayName: profile.displayName ?? context.user.displayName,
    query,
    type,
    groups: groupTimelineByTehranDay(
      items.map((item) => ({ ...item, occurredAt: new Date(item.occurredAt) })),
    ).map((group) => ({
      dayKey: group.dayKey,
      label: group.label,
      items: group.items.map((item) => ({
        ...item,
        occurredAt: item.occurredAt.toISOString(),
      })),
    })),
    nextCursor,
    feedHref,
  };
}
