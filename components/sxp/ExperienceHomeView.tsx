import { ExperienceFeedList } from "@/components/sxp/ExperienceFeedList";
import { ExperienceHero } from "@/components/sxp/ExperienceHero";
import { ExperienceQuickActions } from "@/components/sxp/ExperienceQuickActions";
import { ExperienceWidgetGrid } from "@/components/sxp/ExperienceWidgetGrid";
import type { ExperienceHomeDto } from "@/lib/sxp/hub/load-home";

type ExperienceHomeViewProps = {
  home: ExperienceHomeDto;
};

export function ExperienceHomeView({ home }: ExperienceHomeViewProps) {
  return (
    <div className="mx-auto w-full max-w-[840px] space-y-6">
      <ExperienceHero
        displayName={home.displayName}
        organizationName={home.organizationName}
        studentName={home.studentName}
        portraitUrl={home.portraitUrl}
        membershipLabel={home.membershipLabel}
        membershipLevelLabel={home.membershipLevelLabel}
        completionRatio={home.completionRatio}
        gradeName={home.card?.gradeName ?? null}
        schoolYear={home.card?.schoolYear ?? null}
        branchName={home.card?.branchName ?? null}
        cardHref={home.cardHref}
        timelineHref={home.timelineHref}
        filesHref={home.filesHref}
        filesEnabled={home.filesEnabled}
      />
      <ExperienceQuickActions actions={home.quickActions} />
      <ExperienceWidgetGrid
        widgets={home.widgets}
        timelineHref={home.timelineHref}
        filesHref={home.filesHref}
        filesEnabled={home.filesEnabled}
      />
      <ExperienceFeedList items={home.feed} timelineHref={home.timelineHref} />
    </div>
  );
}
