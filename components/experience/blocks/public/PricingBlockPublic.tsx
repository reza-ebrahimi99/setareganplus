import { PublicRegistrationPricing } from "@/components/registration/PublicRegistrationPricing";
import type { PricingBlockConfig } from "@/lib/experience/blocks/pricing";
import type { ExperiencePublicBlockRendererProps } from "@/lib/experience/definition-types";
import { FLOW_PAYMENT_MODE_LABELS } from "@/lib/registration/flows/constants";

export function PricingBlockPublic({
  config,
  binding,
}: ExperiencePublicBlockRendererProps<PricingBlockConfig>) {
  if (!binding) return null;
  const { flow } = binding;
  const paymentLabel = FLOW_PAYMENT_MODE_LABELS[flow.paymentMode];

  return (
    <section className={config.variant === "compact" ? "space-y-3" : "space-y-4"}>
      {config.sectionTitle ? (
        <h2 className="text-lg font-bold text-primary">{config.sectionTitle}</h2>
      ) : null}
      {config.showPaymentModeLabel !== false ? (
        <p className="text-xs font-medium text-secondary">{paymentLabel}</p>
      ) : null}
      <PublicRegistrationPricing
        paymentMode={flow.paymentMode}
        paymentAmountRials={flow.paymentAmountRials}
        saleAmountRials={flow.saleAmountRials}
        pricingBadge={flow.pricingBadge}
        discountStartsAtIso={flow.discountStartsAt?.toISOString() ?? null}
        discountEndsAtIso={flow.discountEndsAt?.toISOString() ?? null}
        showDiscountCountdown={flow.showDiscountCountdown}
        paymentLabel={paymentLabel}
      />
    </section>
  );
}
