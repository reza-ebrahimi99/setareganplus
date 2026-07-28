import { PublicRegistrationPricing } from "@/components/registration/PublicRegistrationPricing";
import type { PricingBlockConfig } from "@/lib/experience/blocks/pricing";
import type { ExperiencePublicBlockRendererProps } from "@/lib/experience/definition-types";

export function PricingBlockPublic({
  config,
  context,
}: ExperiencePublicBlockRendererProps<PricingBlockConfig>) {
  const { pricing } = context;

  return (
    <section
      className={config.variant === "compact" ? "space-y-3" : "space-y-4"}
    >
      {config.sectionTitle ? (
        <h2 className="text-lg font-bold text-primary">{config.sectionTitle}</h2>
      ) : null}
      {config.showPaymentModeLabel !== false ? (
        <p className="text-xs font-medium text-secondary">{pricing.paymentLabel}</p>
      ) : null}
      <PublicRegistrationPricing
        paymentMode={pricing.paymentMode}
        paymentAmountRials={pricing.paymentAmountRials}
        saleAmountRials={pricing.saleAmountRials}
        pricingBadge={pricing.pricingBadge}
        discountStartsAtIso={pricing.discountStartsAtIso}
        discountEndsAtIso={pricing.discountEndsAtIso}
        showDiscountCountdown={pricing.showDiscountCountdown}
        paymentLabel={pricing.paymentLabel}
      />
    </section>
  );
}
