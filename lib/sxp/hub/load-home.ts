import { ExperienceTimelineVisibility, ExperienceWidgetKey } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { SXP_FEED_LIMIT, SXP_QUICK_ACTION_LIMIT } from "@/lib/sxp/constants";
import { asRecord } from "@/lib/sxp/engine/payload";
import {
  DEFAULT_WIDGET_KEYS,
  type EmptyWidgetPayload,
  type WidgetPayload,
} from "@/lib/sxp/engine/widgets";
import { ensureExperienceProfile } from "@/lib/sxp/profile";
import type { PortalContext } from "@/lib/portal/auth/types";

export type ExperienceQuickAction = {
  code: string;
  label: string;
  href: string;
};

export type ExperienceHomeWidget = {
  key: ExperienceWidgetKey;
  payload: WidgetPayload;
};

export type ExperienceHomeDto = {
  displayName: string;
  organizationName: string;
  studentName: string | null;
  portraitUrl: string | null;
  widgets: ExperienceHomeWidget[];
  feed: Array<{
    id: string;
    title: string;
    summary: string | null;
    occurredAt: Date;
    eventType: string;
  }>;
  quickActions: ExperienceQuickAction[];
};

function asWidgetPayload(value: unknown): WidgetPayload {
  const record = asRecord(value);
  if (record.empty === true) {
    const reason: EmptyWidgetPayload["reason"] =
      record.reason === "phase_s1_unavailable" ? "phase_s1_unavailable" : "no_events";
    return { empty: true, reason };
  }
  return record as WidgetPayload;
}

export async function loadExperienceHome(params: {
  context: PortalContext;
  timelineHref: string;
}): Promise<ExperienceHomeDto> {
  const { context, timelineHref } = params;
  const student = context.authorizedStudents[0] ?? null;

  const profile = await ensureExperienceProfile({
    organizationId: context.organization.id,
    userId: context.user.id,
    displayName: context.user.displayName,
  });

  const [snapshots, feed] = await Promise.all([
    prisma.experienceWidgetSnapshot.findMany({
      where: {
        organizationId: context.organization.id,
        userId: context.user.id,
      },
    }),
    prisma.experienceTimelineEvent.findMany({
      where: {
        organizationId: context.organization.id,
        userId: context.user.id,
        feedEligible: true,
        visibility: {
          in: [
            ExperienceTimelineVisibility.SELF,
            ExperienceTimelineVisibility.GUARDIANS,
          ],
        },
      },
      orderBy: [{ feedRank: "desc" }, { occurredAt: "desc" }],
      take: SXP_FEED_LIMIT,
      select: {
        id: true,
        title: true,
        summary: true,
        occurredAt: true,
        eventType: true,
      },
    }),
  ]);

  const byKey = new Map(
    snapshots.map((row) => [row.widgetKey, asWidgetPayload(row.payload)] as const),
  );
  const widgets: ExperienceHomeWidget[] = DEFAULT_WIDGET_KEYS.map((key) => ({
    key,
    payload: byKey.get(key) ?? { empty: true, reason: "no_events" },
  }));

  const nextAction = byKey.get(ExperienceWidgetKey.NEXT_ACTION);
  const quickActions: ExperienceQuickAction[] = [];
  if (nextAction && nextAction.empty === false && "label" in nextAction) {
    quickActions.push({
      code: nextAction.code,
      label: nextAction.label,
      href: timelineHref,
    });
  }
  if (!quickActions.some((action) => action.code === "VIEW_TIMELINE")) {
    quickActions.push({
      code: "VIEW_TIMELINE",
      label: "مشاهده روند",
      href: timelineHref,
    });
  }

  return {
    displayName: profile.displayName ?? context.user.displayName,
    organizationName: context.organization.name,
    studentName: student?.studentName ?? null,
    portraitUrl: student?.portraitUrl ?? null,
    widgets,
    feed,
    quickActions: quickActions.slice(0, SXP_QUICK_ACTION_LIMIT),
  };
}
