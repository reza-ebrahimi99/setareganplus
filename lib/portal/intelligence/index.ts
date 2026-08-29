/**
 * Portal Intelligence Layer — public API.
 *
 * Data flow:
 *   PortalContext
 *     → loadStudentIntelligenceSnapshot (cached fan-out)
 *       → PortalDashboardEngine / StudentInsightEngine / …
 *         → view models
 *           → Portal screens (JSX)
 *
 * Future AI insertion:
 *   StudentRecommendationEngine.source = "ai"
 *   StudentActivityFeed kind = "ai_event"
 *   Insight engines may attach model scores without changing widget contracts.
 */

export type {
  PortalActivityItem,
  PortalActivityKind,
  PortalIntelligenceAction,
  PortalIntelligenceStatus,
  PortalProgressSnapshot,
  PortalRecommendation,
  PortalRecommendationBundle,
  PortalWidgetModel,
  PortalWidgetPriority,
} from "@/lib/portal/intelligence/types";

export {
  loadStudentIntelligenceSnapshot,
  type IntelligenceLoadOptions,
  type StudentIntelligenceSnapshot,
} from "@/lib/portal/intelligence/snapshot";

export { PortalDashboardEngine, type HomeDashboardModel } from "@/lib/portal/intelligence/dashboard-engine";
export { StudentInsightEngine } from "@/lib/portal/intelligence/insight-engine";
export type {
  AchievementIntelligenceModel,
  AssessmentIntelligenceModel,
  ExperienceIntelligenceModel,
  GuidanceIntelligenceModel,
  ProfileIntelligenceModel,
} from "@/lib/portal/intelligence/insight-engine";
export { StudentActivityFeed } from "@/lib/portal/intelligence/activity-feed";
export { StudentRecommendationEngine } from "@/lib/portal/intelligence/recommendation-engine";
export { StudentProgressEngine } from "@/lib/portal/intelligence/progress-engine";
export { StudentStatusEngine } from "@/lib/portal/intelligence/status-engine";
export { IntelligenceMappers, portalWidgetModelToProps } from "@/lib/portal/intelligence/mappers";
