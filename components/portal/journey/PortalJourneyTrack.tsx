import { PortalJourneyStepCard } from "@/components/portal/journey/PortalJourneyStepCard";
import type { PortalJourneyStep } from "@/components/portal/journey/types";

type PortalJourneyTrackProps = {
  steps: readonly PortalJourneyStep[];
};

/** Configurable milestone track — domain-agnostic. */
export function PortalJourneyTrack({ steps }: PortalJourneyTrackProps) {
  if (steps.length === 0) {
    return (
      <div className="portal-journey-track portal-journey-track--empty" role="status">
        <p className="portal-section-title">هنوز قدمی تعریف نشده</p>
        <p className="portal-section-support">
          وقتی مسیر فعال شود، نقاط عطف اینجا ظاهر می‌شوند.
        </p>
      </div>
    );
  }

  return (
    <ol className="portal-journey-track" aria-label="نقاط عطف مسیر">
      {steps.map((step, index) => (
        <PortalJourneyStepCard key={step.id} step={step} index={index} />
      ))}
    </ol>
  );
}
