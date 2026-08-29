import { PortalJourneyHeroBanner } from "@/components/portal/journey/PortalJourneyHero";
import { PortalJourneyProgressBar } from "@/components/portal/journey/PortalJourneyProgress";
import { PortalJourneySummary } from "@/components/portal/journey/PortalJourneySummary";
import { PortalJourneyTrack } from "@/components/portal/journey/PortalJourneyTrack";
import type { PortalJourneyModel } from "@/components/portal/journey/types";

type PortalJourneyScreenProps = {
  model: PortalJourneyModel;
  /** Optional sticky mobile CTA using the hero action. */
  showMobileStickyCta?: boolean;
};

/**
 * Generic Journey screen layout.
 * Swap `model` to render Guidance, Admissions, Homework, etc.
 */
export function PortalJourneyScreen({
  model,
  showMobileStickyCta = true,
}: PortalJourneyScreenProps) {
  const stickyCta = showMobileStickyCta ? model.hero.cta : undefined;

  return (
    <div
      className="portal-journey"
      data-portal-journey={model.journeyId}
    >
      <PortalJourneyHeroBanner hero={model.hero} />

      <PortalJourneyProgressBar progress={model.progress} sticky />

      <div className="portal-journey__layout">
        <div className="portal-journey__main">
          <div className="portal-journey__intro">
            <h2 className="portal-section-title">{model.title}</h2>
            {model.subtitle ? (
              <p className="portal-section-support">{model.subtitle}</p>
            ) : null}
            {model.metaLine ? (
              <p className="portal-journey__meta">{model.metaLine}</p>
            ) : null}
          </div>
          <PortalJourneyTrack steps={model.steps} />
        </div>

        <aside className="portal-journey__aside">
          <PortalJourneySummary progress={model.progress} />
        </aside>
      </div>

      {stickyCta ? (
        <div className="portal-journey-sticky-cta">
          <a href={stickyCta.href} className="portal-journey-sticky-cta__btn">
            {stickyCta.label}
          </a>
        </div>
      ) : null}
    </div>
  );
}
