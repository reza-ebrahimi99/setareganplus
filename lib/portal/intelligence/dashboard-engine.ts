/**
 * PortalDashboardEngine — single orchestration point for Student Home.
 */

import {
  buildPortalHomeHero,
  buildPortalHomeModules,
  buildPortalHomeProgress,
  buildPortalQuickActions,
  type PortalHomeHeroModel,
  type PortalHomeModuleCard,
  type PortalHomeProgressModel,
  type PortalQuickAction,
} from "@/lib/portal/student/home-presentation";
import { StudentActivityFeed } from "@/lib/portal/intelligence/activity-feed";
import { StudentInsightEngine } from "@/lib/portal/intelligence/insight-engine";
import { StudentRecommendationEngine } from "@/lib/portal/intelligence/recommendation-engine";
import { StudentStatusEngine } from "@/lib/portal/intelligence/status-engine";
import type { StudentIntelligenceSnapshot } from "@/lib/portal/intelligence/snapshot";
import type {
  PortalActivityItem,
  PortalIntelligenceStatus,
  PortalRecommendationBundle,
  PortalWidgetModel,
} from "@/lib/portal/intelligence/types";
import type { PortalStudentDashboardDto } from "@/lib/portal/student/dashboard";
import type { GuidanceTimelineStep } from "@/lib/guidance/timeline";
import { buildAssessmentCenterInsights } from "@/lib/portal/student/assessment-insights";

export type HomeDashboardModel = {
  dashboard: PortalStudentDashboardDto;
  guidanceEnabled: boolean;
  sxpEnabled: boolean;
  guidanceSteps: readonly GuidanceTimelineStep[] | null;
  hasGuidancePlan: boolean;
  hero: PortalHomeHeroModel;
  progress: PortalHomeProgressModel | null;
  quickActions: readonly PortalQuickAction[];
  modules: readonly PortalHomeModuleCard[];
  recommendations: PortalRecommendationBundle;
  activity: readonly PortalActivityItem[];
  overallStatus: PortalIntelligenceStatus;
  widgets: readonly PortalWidgetModel[];
};

function mapRecommendationToWidget(
  recommendations: PortalRecommendationBundle,
): PortalWidgetModel {
  const primary = recommendations.primary;
  if (!primary) {
    return {
      id: "recommendations",
      title: "پیشنهاد امروز",
      status: "healthy",
      priority: "secondary",
      empty: true,
      emptyTitle: "همه‌چیز مرتب است",
      emptyDescription: "فعلاً پیشنهاد فوری نداری.",
      module: "notifications",
      icon: "spark",
      accent: "purple",
    };
  }

  return {
    id: "recommendations",
    title: "پیشنهاد امروز",
    status: primary.status,
    priority: "primary",
    description: primary.description,
    actions: [primary.action],
    content: {
      primary,
      secondary: recommendations.secondary,
    },
    module: "quick-actions",
    icon: "spark",
    accent: "gold",
  };
}

export const PortalDashboardEngine = {
  /**
   * Build the Home presentation model from a shared snapshot.
   * Runs recommendation / activity / status engines once.
   */
  buildHome(snapshot: StudentIntelligenceSnapshot): HomeDashboardModel {
    const guidanceSteps = snapshot.guidance.steps;
    const hasGuidancePlan = Boolean(snapshot.guidance.plan);
    const assessmentInsights = buildAssessmentCenterInsights(
      snapshot.assessments ?? [],
    );
    const achievementCount = snapshot.achievements?.length ?? 0;

    const recommendations = StudentRecommendationEngine.build({
      guidanceEnabled: snapshot.flags.guidanceEnabled,
      hasGuidancePlan,
      guidanceSteps,
      profile: snapshot.profile,
      assessmentInsights,
      achievementCount,
      sxpEnabled: snapshot.flags.sxpEnabled,
    });

    const activity = StudentActivityFeed.build({
      assessments: snapshot.assessments ?? undefined,
      achievements: snapshot.achievements ?? undefined,
      guidanceSteps,
      dashboard: snapshot.dashboard,
      experienceFeed: snapshot.experienceHome?.feed,
      limit: 8,
    });

    const guidanceStatus = StudentStatusEngine.fromGuidanceSteps(guidanceSteps);
    const profileStatus = StudentStatusEngine.fromProfile(snapshot.profile);
    const assessmentStatus =
      StudentStatusEngine.fromAssessments(assessmentInsights);
    const overallStatus = StudentStatusEngine.combine([
      guidanceStatus,
      profileStatus,
      assessmentStatus,
    ]);

    const hero = buildPortalHomeHero({
      studentName: snapshot.dashboard.studentName,
      guidanceEnabled: snapshot.flags.guidanceEnabled,
      hasPlan: hasGuidancePlan,
      steps: guidanceSteps,
      assessmentCount: snapshot.dashboard.assessmentCount,
      achievementCount: snapshot.dashboard.achievementCount,
    });

    // Prefer rule-based primary recommendation CTA when it matches journey urgency.
    if (recommendations.primary && hero.cta == null) {
      hero.cta = recommendations.primary.action;
    }

    const progress = buildPortalHomeProgress(guidanceSteps);
    const quickActions = buildPortalQuickActions({
      guidanceEnabled: snapshot.flags.guidanceEnabled,
      hasPlan: hasGuidancePlan,
      steps: guidanceSteps,
    });
    const modules = buildPortalHomeModules({
      guidanceEnabled: snapshot.flags.guidanceEnabled,
      sxpEnabled: snapshot.flags.sxpEnabled,
      hasPlan: hasGuidancePlan,
      progress,
      assessmentCount: snapshot.dashboard.assessmentCount,
      achievementCount: snapshot.dashboard.achievementCount,
    });

    // Touch insight engine so Home shares the same derived guidance model.
    StudentInsightEngine.guidance(snapshot);

    return {
      dashboard: snapshot.dashboard,
      guidanceEnabled: snapshot.flags.guidanceEnabled,
      sxpEnabled: snapshot.flags.sxpEnabled,
      guidanceSteps,
      hasGuidancePlan,
      hero,
      progress,
      quickActions,
      modules,
      recommendations,
      activity,
      overallStatus,
      widgets: [mapRecommendationToWidget(recommendations)],
    };
  },
} as const;
