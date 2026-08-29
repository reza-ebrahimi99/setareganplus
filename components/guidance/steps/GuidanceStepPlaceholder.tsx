import { GuidanceStepShell } from "@/components/guidance/steps/GuidanceStepShell";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";
import type { GuidanceJourneyStepDefinition } from "@/lib/guidance/journey/steps";

type GuidanceStepPlaceholderProps = {
  step: GuidanceJourneyStepDefinition;
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
};

/** Temporary render target for journey steps not yet built in this milestone. */
export function GuidanceStepPlaceholder({
  step,
  sidebarSteps,
  completionPercentage,
}: GuidanceStepPlaceholderProps) {
  return (
    <GuidanceStepShell
      stepId={step.id}
      stepCount={12}
      title={step.title}
      description={step.description}
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
    >
      <div className="gpj-card">
        <h2 className="gpj-card__title">این گام به‌زودی فعال می‌شود</h2>
        <p className="gpj-card__desc">
          معماری این گام در موتور سفر هدایت آماده است و در فاز بعدی تکمیل
          می‌شود.
        </p>
      </div>
    </GuidanceStepShell>
  );
}
