/**
 * StudentStatusEngine — single status vocabulary for Portal OS.
 */

import type { PortalIntelligenceStatus } from "@/lib/portal/intelligence/types";
import type { GuidanceTimelineStep } from "@/lib/guidance/timeline";
import type { PortalStudentProfileDto } from "@/lib/portal/student/profile";
import type { AssessmentCenterInsights } from "@/lib/portal/student/assessment-insights";

export const StudentStatusEngine = {
  fromGuidanceSteps(
    steps: readonly GuidanceTimelineStep[] | null | undefined,
  ): PortalIntelligenceStatus {
    if (!steps || steps.length === 0) return "needs_attention";
    if (steps.some((step) => step.state === "pending_review")) return "waiting";
    if (steps.some((step) => step.state === "active")) return "needs_attention";
    if (steps.every((step) => step.state === "complete")) return "completed";
    return "healthy";
  },

  fromProfile(profile: PortalStudentProfileDto): PortalIntelligenceStatus {
    const checks = [
      Boolean(profile.studentName),
      Boolean(profile.gradeName),
      Boolean(profile.schoolYear),
      Boolean(profile.portraitUrl),
    ];
    const ratio = checks.filter(Boolean).length / checks.length;
    if (ratio >= 1) return "completed";
    if (ratio >= 0.75) return "healthy";
    return "needs_attention";
  },

  fromAssessments(insights: AssessmentCenterInsights): PortalIntelligenceStatus {
    if (insights.count === 0) return "needs_attention";
    if (insights.needsImprovement && insights.needsImprovement.percentage < 50) {
      return "needs_attention";
    }
    return "healthy";
  },

  fromAchievements(total: number): PortalIntelligenceStatus {
    return total > 0 ? "healthy" : "needs_attention";
  },

  /**
   * Overall portal health — worst actionable signal wins.
   * Order: blocked > waiting > needs_attention > healthy > completed
   */
  combine(
    statuses: readonly PortalIntelligenceStatus[],
  ): PortalIntelligenceStatus {
    const rank: Record<PortalIntelligenceStatus, number> = {
      blocked: 0,
      waiting: 1,
      needs_attention: 2,
      healthy: 3,
      completed: 4,
    };
    let best: PortalIntelligenceStatus = "healthy";
    for (const status of statuses) {
      if (rank[status] < rank[best]) best = status;
    }
    return best;
  },
} as const;
