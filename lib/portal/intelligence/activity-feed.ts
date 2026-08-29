/**
 * StudentActivityFeed — chronological activity from existing Portal data only.
 * Future AI events insert as kind: "ai_event" without changing consumers.
 */

import type { GuidanceTimelineStep } from "@/lib/guidance/timeline";
import type {
  PortalActivityItem,
  PortalIntelligenceStatus,
} from "@/lib/portal/intelligence/types";
import type { PortalAssessmentResultDto } from "@/lib/portal/student/assessments";
import type { PortalAchievementDto } from "@/lib/portal/student/achievements";
import type { PortalStudentDashboardDto } from "@/lib/portal/student/dashboard";

function sortChronological(
  items: PortalActivityItem[],
): PortalActivityItem[] {
  return [...items].sort(
    (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
  );
}

export const StudentActivityFeed = {
  build(input: {
    assessments?: readonly PortalAssessmentResultDto[];
    achievements?: readonly PortalAchievementDto[];
    guidanceSteps?: readonly GuidanceTimelineStep[] | null;
    dashboard?: PortalStudentDashboardDto | null;
    experienceFeed?: ReadonlyArray<{
      id: string;
      title: string;
      summary: string | null;
      occurredAt: Date;
    }>;
    limit?: number;
  }): PortalActivityItem[] {
    const items: PortalActivityItem[] = [];

    for (const row of input.assessments ?? []) {
      if (!row.assessmentDate && row.score == null) continue;
      items.push({
        id: `assessment:${row.id}`,
        kind: "assessment_completed",
        title: row.assessmentTitle,
        summary:
          row.score != null ? `نمره ثبت‌شده: ${row.score}` : row.providerName,
        occurredAt: row.assessmentDate ?? new Date(0),
        href: "/portal/student/assessments",
        status: "completed",
      });
    }

    for (const row of input.achievements ?? []) {
      items.push({
        id: `achievement:${row.id}`,
        kind: "badge_unlocked",
        title: row.title,
        summary: row.categoryName,
        occurredAt: row.achievementDate ?? new Date(0),
        href: "/portal/student/achievements",
        status: "completed",
      });
    }

    if (input.guidanceSteps) {
      for (const step of input.guidanceSteps) {
        if (step.state !== "complete") continue;
        items.push({
          id: `guidance:${step.key}`,
          kind: "guidance_progressed",
          title: `تکمیل شد: ${step.label}`,
          summary: "مسیر انتخاب رشته",
          // No reliable timestamp on checklist — keep epoch so real dated events rank first.
          occurredAt: new Date(0),
          href: "/portal/student/services/guidance",
          status: "completed" satisfies PortalIntelligenceStatus,
        });
      }
    }

    for (const row of input.experienceFeed ?? []) {
      items.push({
        id: `experience:${row.id}`,
        kind: "experience_event",
        title: row.title,
        summary: row.summary ?? undefined,
        occurredAt: row.occurredAt,
        href: "/portal/student/timeline",
        status: "healthy",
      });
    }

    // Dashboard trend points (when assessments list not loaded) — avoid duplicates.
    if ((!input.assessments || input.assessments.length === 0) && input.dashboard) {
      for (const [index, point] of input.dashboard.trendPoints.entries()) {
        items.push({
          id: `trend:${index}:${point.assessmentTitle}`,
          kind: "assessment_completed",
          title: point.assessmentTitle,
          summary:
            point.score != null ? `نمره: ${point.score}` : undefined,
          occurredAt: point.assessmentDate ?? new Date(0),
          href: "/portal/student/assessments",
          status: "completed",
        });
      }
    }

    const limit = input.limit ?? 20;
    return sortChronological(items).slice(0, limit);
  },
} as const;
