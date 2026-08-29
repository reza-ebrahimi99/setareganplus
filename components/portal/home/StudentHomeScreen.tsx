import { PortalHomeHero } from "@/components/portal/home/PortalHomeHero";
import { PortalQuickActionsWidget } from "@/components/portal/home/PortalQuickActionsWidget";
import { PortalProgressWidget } from "@/components/portal/home/PortalProgressWidget";
import { PortalGuidanceSummaryWidget } from "@/components/portal/home/PortalGuidanceSummaryWidget";
import {
  PortalAchievementsWidget,
  PortalAssessmentsWidget,
} from "@/components/portal/home/PortalAssessmentsWidget";
import { PortalActivityWidget } from "@/components/portal/home/PortalActivityWidget";
import { PortalNotificationsWidget } from "@/components/portal/home/PortalNotificationsWidget";
import { PortalModulesWidget } from "@/components/portal/home/PortalModulesWidget";
import type { GuidanceTimelineStep } from "@/lib/guidance/timeline";
import type { PortalStudentDashboardDto } from "@/lib/portal/student/dashboard";
import {
  buildPortalHomeHero,
  buildPortalHomeModules,
  buildPortalHomeProgress,
  buildPortalQuickActions,
} from "@/lib/portal/student/home-presentation";

type StudentHomeScreenProps = {
  dashboard: PortalStudentDashboardDto;
  guidanceEnabled: boolean;
  sxpEnabled: boolean;
  guidanceSteps: readonly GuidanceTimelineStep[] | null;
  hasGuidancePlan: boolean;
};

/**
 * Student OS Home Screen — composition only.
 * All widgets receive prepared view-models; no fetching here.
 */
export function StudentHomeScreen({
  dashboard,
  guidanceEnabled,
  sxpEnabled,
  guidanceSteps,
  hasGuidancePlan,
}: StudentHomeScreenProps) {
  const progress = buildPortalHomeProgress(guidanceSteps);
  const hero = buildPortalHomeHero({
    studentName: dashboard.studentName,
    guidanceEnabled,
    hasPlan: hasGuidancePlan,
    steps: guidanceSteps,
    assessmentCount: dashboard.assessmentCount,
    achievementCount: dashboard.achievementCount,
  });
  const quickActions = buildPortalQuickActions({
    guidanceEnabled,
    hasPlan: hasGuidancePlan,
    steps: guidanceSteps,
  });
  const modules = buildPortalHomeModules({
    guidanceEnabled,
    sxpEnabled,
    hasPlan: hasGuidancePlan,
    progress,
    assessmentCount: dashboard.assessmentCount,
    achievementCount: dashboard.achievementCount,
  });

  const gradeLine = [dashboard.gradeName, dashboard.schoolYear]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="portal-home">
      <PortalHomeHero
        hero={hero}
        studentName={dashboard.studentName}
        gradeLine={gradeLine}
        portraitUrl={dashboard.portraitUrl}
      />

      <PortalQuickActionsWidget actions={quickActions} />

      <div
        className={[
          "portal-bento",
          guidanceEnabled ? "" : "portal-bento--no-guidance",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <PortalProgressWidget
          progress={progress}
          assessmentCount={dashboard.assessmentCount}
          achievementCount={dashboard.achievementCount}
        />
        <PortalGuidanceSummaryWidget
          enabled={guidanceEnabled}
          hasPlan={hasGuidancePlan}
          steps={guidanceSteps}
          progress={progress}
        />
        <PortalAssessmentsWidget dashboard={dashboard} />
        <PortalAchievementsWidget count={dashboard.achievementCount} />
        <PortalNotificationsWidget />
        <PortalActivityWidget trendPoints={dashboard.trendPoints} />
      </div>

      <PortalModulesWidget modules={modules} />
    </div>
  );
}
