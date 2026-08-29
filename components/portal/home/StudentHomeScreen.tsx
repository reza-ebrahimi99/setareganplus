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
import type { HomeDashboardModel } from "@/lib/portal/intelligence";

type StudentHomeScreenProps = {
  model: HomeDashboardModel;
};

/**
 * Student OS Home Screen — composition only.
 * Presentation models come from PortalDashboardEngine (Intelligence Layer).
 */
export function StudentHomeScreen({ model }: StudentHomeScreenProps) {
  const {
    dashboard,
    guidanceEnabled,
    hero,
    progress,
    quickActions,
    modules,
    guidanceSteps,
    hasGuidancePlan,
  } = model;

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
