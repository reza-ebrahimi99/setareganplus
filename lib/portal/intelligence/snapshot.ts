/**
 * Shared student intelligence snapshot — one read fan-out per request.
 * Engines consume this; pages must not re-fetch the same loaders.
 */

import { cache } from "react";
import { buildGuidancePortalTimeline } from "@/lib/guidance/timeline";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import {
  loadGuidancePlanForPortalUser,
  type GuidancePortalPlanSummary,
} from "@/lib/guidance/portal";
import type { GuidanceTimelineStep } from "@/lib/guidance/timeline";
import type { PortalContext } from "@/lib/portal/auth/types";
import { loadPortalStudentAchievements } from "@/lib/portal/student/achievements";
import type { PortalAchievementDto } from "@/lib/portal/student/achievements";
import { loadPortalStudentAssessments } from "@/lib/portal/student/assessments";
import type { PortalAssessmentResultDto } from "@/lib/portal/student/assessments";
import {
  loadStudentPortalDashboard,
  type PortalStudentDashboardDto,
} from "@/lib/portal/student/dashboard";
import {
  loadPortalStudentProfile,
  type PortalStudentProfileDto,
} from "@/lib/portal/student/profile";
import { isSxpEnabled } from "@/lib/sxp/flags";
import {
  loadExperienceHome,
  type ExperienceHomeDto,
} from "@/lib/sxp/hub/load-home";

export type StudentIntelligenceSnapshot = {
  organizationId: string;
  organizationName: string;
  userId: string;
  userDisplayName: string;
  studentId: string;
  flags: {
    guidanceEnabled: boolean;
    sxpEnabled: boolean;
  };
  dashboard: PortalStudentDashboardDto;
  profile: PortalStudentProfileDto;
  assessments: PortalAssessmentResultDto[] | null;
  achievements: PortalAchievementDto[] | null;
  guidance: {
    plan: GuidancePortalPlanSummary | null;
    steps: GuidanceTimelineStep[] | null;
  };
  experienceHome: ExperienceHomeDto | null;
  errors: {
    assessments?: string;
    achievements?: string;
  };
};

export type IntelligenceLoadOptions = {
  /** Load assessment history (Assessment Center / activity). Default true. */
  includeAssessments?: boolean;
  /** Load achievements list. Default true. */
  includeAchievements?: boolean;
  /** Load SXP experience home when flag on. Default true. */
  includeExperience?: boolean;
};

async function loadStudentIntelligenceSnapshotUncached(
  context: PortalContext,
  studentId: string,
  options: IntelligenceLoadOptions = {},
): Promise<StudentIntelligenceSnapshot> {
  const includeAssessments = options.includeAssessments !== false;
  const includeAchievements = options.includeAchievements !== false;
  const includeExperience = options.includeExperience !== false;

  const [guidanceEnabled, sxpEnabled, dashboard] = await Promise.all([
    isGuidanceEnabled(context.organization.id),
    isSxpEnabled(context.organization.id),
    loadStudentPortalDashboard(context, studentId),
  ]);

  const profile = loadPortalStudentProfile(context, studentId);

  const guidancePromise = guidanceEnabled
    ? loadGuidancePlanForPortalUser({
        organizationId: context.organization.id,
        userId: context.user.id,
        studentId,
      })
    : Promise.resolve(null);

  const assessmentsPromise = includeAssessments
    ? loadPortalStudentAssessments(context, studentId)
        .then((rows) => ({ ok: true as const, rows }))
        .catch(() => ({ ok: false as const, rows: null }))
    : Promise.resolve({ ok: true as const, rows: null });

  const achievementsPromise = includeAchievements
    ? loadPortalStudentAchievements(context, studentId)
        .then((rows) => ({ ok: true as const, rows }))
        .catch(() => ({ ok: false as const, rows: null }))
    : Promise.resolve({ ok: true as const, rows: null });

  const experiencePromise =
    includeExperience && sxpEnabled
      ? loadExperienceHome({
          context,
          timelineHref: "/portal/student/timeline",
        })
      : Promise.resolve(null);

  const [plan, assessmentsResult, achievementsResult, experienceHome] =
    await Promise.all([
      guidancePromise,
      assessmentsPromise,
      achievementsPromise,
      experiencePromise,
    ]);

  const steps =
    plan != null ? buildGuidancePortalTimeline(plan) : null;

  return {
    organizationId: context.organization.id,
    organizationName: context.organization.name,
    userId: context.user.id,
    userDisplayName: context.user.displayName,
    studentId,
    flags: { guidanceEnabled, sxpEnabled },
    dashboard,
    profile,
    assessments: assessmentsResult.rows,
    achievements: achievementsResult.rows,
    guidance: { plan, steps },
    experienceHome,
    errors: {
      assessments: assessmentsResult.ok ? undefined : "assessments_unavailable",
      achievements: achievementsResult.ok
        ? undefined
        : "achievements_unavailable",
    },
  };
}

/**
 * Request-memoized snapshot loader (React `cache`).
 * Multiple engines/pages in one RSC tree share one fan-out.
 */
export const loadStudentIntelligenceSnapshot = cache(
  loadStudentIntelligenceSnapshotUncached,
);
