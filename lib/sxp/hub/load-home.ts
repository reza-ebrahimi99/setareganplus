import { ExperienceTimelineVisibility, ExperienceWidgetKey } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  SXP_FEED_LIMIT,
  SXP_MEMBERSHIP_LEVEL_SOON,
  SXP_QUICK_ACTION_LIMIT,
} from "@/lib/sxp/constants";
import { membershipLabelFor } from "@/lib/sxp/engine/card";
import { asRecord } from "@/lib/sxp/engine/payload";
import {
  DEFAULT_WIDGET_KEYS,
  type EmptyWidgetPayload,
  type WidgetPayload,
} from "@/lib/sxp/engine/widgets";
import { ensureStudentCardsFromContext } from "@/lib/sxp/engine/handlers/student-card-refresher";
import { isSxpFilesEnabled } from "@/lib/sxp/flags";
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

export type ExperienceCardStripDto = {
  studentId: string;
  displayName: string;
  studentCode: string | null;
  membershipLabel: string;
  gradeName: string | null;
  schoolYear: string | null;
  schoolName: string;
  branchName: string | null;
  portraitUrl: string | null;
  completionRatio: number;
};

export type ExperienceHomeDto = {
  displayName: string;
  organizationName: string;
  studentName: string | null;
  portraitUrl: string | null;
  membershipLabel: string;
  membershipLevelLabel: string;
  completionRatio: number;
  coverUrl: string | null;
  card: ExperienceCardStripDto | null;
  cards: ExperienceCardStripDto[];
  filesCount: number;
  filesEnabled: boolean;
  timelineHref: string;
  cardHref: string;
  filesHref: string;
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
  cardHref: string;
  filesHref: string;
}): Promise<ExperienceHomeDto> {
  const { context, timelineHref, cardHref, filesHref } = params;
  const student = context.authorizedStudents[0] ?? null;
  const filesEnabled = await isSxpFilesEnabled(context.organization.id);

  const profile = await ensureExperienceProfile({
    organizationId: context.organization.id,
    userId: context.user.id,
    displayName: context.user.displayName,
  });

  await ensureStudentCardsFromContext(context);

  const [snapshots, feed, cardRows, filesCount] = await Promise.all([
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
    prisma.experienceStudentCard.findMany({
      where: {
        organizationId: context.organization.id,
        userId: context.user.id,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.experienceFile.count({
      where: {
        organizationId: context.organization.id,
        userId: context.user.id,
      },
    }),
  ]);

  const authorizedIds = new Set(
    context.authorizedStudents.map((row) => row.studentId),
  );
  const cards: ExperienceCardStripDto[] = cardRows
    .filter((row) => authorizedIds.has(row.studentId))
    .map((row) => ({
      studentId: row.studentId,
      displayName: row.displayName,
      studentCode: row.studentCode,
      membershipLabel: row.membershipLabel,
      gradeName: row.gradeName,
      schoolYear: row.schoolYear,
      schoolName: row.schoolName,
      branchName: row.branchName,
      portraitUrl: row.portraitUrl,
      completionRatio: row.completionRatio,
    }));
  const card = cards[0] ?? null;

  const byKey = new Map(
    snapshots.map((row) => [row.widgetKey, asWidgetPayload(row.payload)] as const),
  );
  const widgetKeys = filesEnabled
    ? DEFAULT_WIDGET_KEYS
    : DEFAULT_WIDGET_KEYS.filter((key) => key !== ExperienceWidgetKey.FILES_READY);
  const widgets: ExperienceHomeWidget[] = widgetKeys.map((key) => ({
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
  if (filesEnabled && !quickActions.some((action) => action.code === "VIEW_FILES")) {
    quickActions.push({
      code: "VIEW_FILES",
      label: "فایل‌ها",
      href: filesHref,
    });
  }
  if (!quickActions.some((action) => action.code === "VIEW_TIMELINE")) {
    quickActions.push({
      code: "VIEW_TIMELINE",
      label: "مشاهده روند",
      href: timelineHref,
    });
  }
  if (!quickActions.some((action) => action.code === "VIEW_CARD")) {
    quickActions.push({
      code: "VIEW_CARD",
      label: "کارت دیجیتال",
      href: cardHref,
    });
  }

  return {
    displayName: profile.displayName ?? context.user.displayName,
    organizationName: context.organization.name,
    studentName: student?.studentName ?? card?.displayName ?? null,
    portraitUrl: student?.portraitUrl ?? card?.portraitUrl ?? null,
    membershipLabel:
      card?.membershipLabel ?? membershipLabelFor(context.activeLink.accountType),
    membershipLevelLabel: SXP_MEMBERSHIP_LEVEL_SOON,
    completionRatio: card?.completionRatio ?? 0,
    coverUrl: null,
    card,
    cards,
    filesCount,
    filesEnabled,
    timelineHref,
    cardHref,
    filesHref,
    widgets,
    feed,
    quickActions: quickActions.slice(0, SXP_QUICK_ACTION_LIMIT),
  };
}
