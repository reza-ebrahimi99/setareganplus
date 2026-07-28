import { DiscountCountdown } from "@/components/registration/DiscountCountdown";
import type { CountdownBlockConfig } from "@/lib/experience/blocks/countdown";
import type { ExperiencePublicBlockRendererProps } from "@/lib/experience/definition-types";

export function CountdownBlockPublic({
  config,
  binding,
}: ExperiencePublicBlockRendererProps<CountdownBlockConfig>) {
  if (!binding) return null;
  const { flow } = binding;
  const endsAtIso = flow.pricing.discountEndsAtIso;
  const enabled = flow.pricing.showCountdown;

  if (!enabled && !config.showWhenInactive) {
    return null;
  }

  if (!endsAtIso) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border bg-surface px-6 py-6">
      {config.heading ? (
        <h2 className="mb-4 text-base font-semibold text-primary">{config.heading}</h2>
      ) : null}
      <DiscountCountdown endsAtIso={endsAtIso} enabled={enabled} />
    </section>
  );
}
