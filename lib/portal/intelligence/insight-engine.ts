/**
 * StudentInsightEngine — module intelligence models from a shared snapshot.
 */

import {
  buildGuidanceEmptyJourneyHero,
  buildGuidanceJourneyModel,
} from "@/lib/guidance/journey-presentation";
import type { PortalJourneyHero, PortalJourneyModel } from "@/components/portal/journey/types";
import { buildAssessmentCenterInsights } from "@/lib/portal/student/assessment-insights";
import { buildTrophyRoomInsights } from "@/lib/portal/student/trophy-insights";
import type { StudentIntelligenceSnapshot } from "@/lib/portal/intelligence/snapshot";
import { StudentProgressEngine } from "@/lib/portal/intelligence/progress-engine";
import { StudentStatusEngine } from "@/lib/portal/intelligence/status-engine";
import { StudentActivityFeed } from "@/lib/portal/intelligence/activity-feed";
import type {
  PortalActivityItem,
  PortalIntelligenceStatus,
  PortalProgressSnapshot,
} from "@/lib/portal/intelligence/types";
import type { AssessmentCenterInsights } from "@/lib/portal/student/assessment-insights";
import type { TrophyRoomInsights } from "@/lib/portal/student/trophy-insights";
import type { PortalAssessmentResultDto } from "@/lib/portal/student/assessments";
import type { PortalAchievementDto } from "@/lib/portal/student/achievements";
import type { PortalStudentProfileDto } from "@/lib/portal/student/profile";
import type { ExperienceHomeDto } from "@/lib/sxp/hub/load-home";

export type GuidanceIntelligenceModel = {
  enabled: boolean;
  hasPlan: boolean;
  journey: PortalJourneyModel | null;
  emptyHero: PortalJourneyHero | null;
  progress: PortalProgressSnapshot | null;
  status: PortalIntelligenceStatus;
  nextActionHref: string | null;
  nextActionLabel: string | null;
};

export type AssessmentIntelligenceModel = {
  results: PortalAssessmentResultDto[];
  insights: AssessmentCenterInsights;
  status: PortalIntelligenceStatus;
  upcomingAvailable: false;
};

export type AchievementIntelligenceModel = {
  achievements: PortalAchievementDto[];
  insights: TrophyRoomInsights;
  status: PortalIntelligenceStatus;
  completionPercent: number | null;
};

export type ExperienceIntelligenceModel = {
  enabled: boolean;
  home: ExperienceHomeDto | null;
  status: PortalIntelligenceStatus;
  /** Architecture placeholders — null until gamification data exists. */
  level: null;
  xp: null;
  nextMilestone: null;
  rewardSuggestions: readonly [];
  recentActivity: PortalActivityItem[];
};

export type ProfileIntelligenceModel = {
  profile: PortalStudentProfileDto;
  organizationName: string;
  userDisplayName: string;
  progress: PortalProgressSnapshot;
  status: PortalIntelligenceStatus;
  securityStatus: "architecture_pending";
  guardianSummary: null;
};

export const StudentInsightEngine = {
  guidance(snapshot: StudentIntelligenceSnapshot): GuidanceIntelligenceModel {
    if (!snapshot.flags.guidanceEnabled) {
      return {
        enabled: false,
        hasPlan: false,
        journey: null,
        emptyHero: null,
        progress: null,
        status: "healthy",
        nextActionHref: null,
        nextActionLabel: null,
      };
    }

    if (!snapshot.guidance.plan || !snapshot.guidance.steps) {
      return {
        enabled: true,
        hasPlan: false,
        journey: null,
        emptyHero: buildGuidanceEmptyJourneyHero(),
        progress: null,
        status: "needs_attention",
        nextActionHref: "/guidance/pre-register",
        nextActionLabel: "شروع پیش‌ثبت‌نام",
      };
    }

    const journey = buildGuidanceJourneyModel({
      steps: snapshot.guidance.steps,
      publicId: snapshot.guidance.plan.publicId,
    });
    const progress = StudentProgressEngine.fromGuidanceSteps(
      snapshot.guidance.steps,
    );
    const active = journey.steps.find(
      (step) => step.state === "active" || step.state === "waiting",
    );

    return {
      enabled: true,
      hasPlan: true,
      journey,
      emptyHero: null,
      progress,
      status: StudentStatusEngine.fromGuidanceSteps(snapshot.guidance.steps),
      nextActionHref: active?.action?.href ?? journey.hero.cta?.href ?? null,
      nextActionLabel: active?.action?.label ?? journey.hero.cta?.label ?? null,
    };
  },

  assessments(snapshot: StudentIntelligenceSnapshot): AssessmentIntelligenceModel {
    const results = snapshot.assessments ?? [];
    const insights = buildAssessmentCenterInsights(results);
    return {
      results,
      insights,
      status: StudentStatusEngine.fromAssessments(insights),
      upcomingAvailable: false,
    };
  },

  achievements(
    snapshot: StudentIntelligenceSnapshot,
  ): AchievementIntelligenceModel {
    const achievements = snapshot.achievements ?? [];
    const insights = buildTrophyRoomInsights(achievements);
    return {
      achievements,
      insights,
      status: StudentStatusEngine.fromAchievements(insights.total),
      completionPercent: null,
    };
  },

  experience(snapshot: StudentIntelligenceSnapshot): ExperienceIntelligenceModel {
    if (!snapshot.flags.sxpEnabled || !snapshot.experienceHome) {
      return {
        enabled: snapshot.flags.sxpEnabled,
        home: null,
        status: "healthy",
        level: null,
        xp: null,
        nextMilestone: null,
        rewardSuggestions: [],
        recentActivity: [],
      };
    }

    const recentActivity = StudentActivityFeed.build({
      experienceFeed: snapshot.experienceHome.feed,
      limit: 10,
    });

    return {
      enabled: true,
      home: snapshot.experienceHome,
      status: "healthy",
      level: null,
      xp: null,
      nextMilestone: null,
      rewardSuggestions: [],
      recentActivity,
    };
  },

  profile(snapshot: StudentIntelligenceSnapshot): ProfileIntelligenceModel {
    return {
      profile: snapshot.profile,
      organizationName: snapshot.organizationName,
      userDisplayName: snapshot.userDisplayName,
      progress: StudentProgressEngine.fromProfile(snapshot.profile),
      status: StudentStatusEngine.fromProfile(snapshot.profile),
      securityStatus: "architecture_pending",
      guardianSummary: null,
    };
  },
} as const;
