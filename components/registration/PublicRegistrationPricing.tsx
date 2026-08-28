"use client";

import { useMemo, useState } from "react";
import { RegistrationFlowPaymentMode } from "@/generated/prisma/enums";
import type { RegistrationFlowPaymentMode as PaymentMode } from "@/generated/prisma/enums";
import { DiscountCountdown } from "@/components/registration/DiscountCountdown";
import { RegistrationPricingCard } from "@/components/registration/RegistrationPricingCard";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { resolveTimedDiscountPricing } from "@/lib/registration/timed-discount";

export type PublicRegistrationPricingProps = {
  paymentMode: PaymentMode;
  paymentAmountRials: number;
  saleAmountRials: number | null;
  pricingBadge: string | null;
  discountStartsAtIso: string | null;
  discountEndsAtIso: string | null;
  showDiscountCountdown: boolean;
  paymentLabel: string;
};

export function PublicRegistrationPricing({
  paymentMode,
  paymentAmountRials,
  saleAmountRials,
  pricingBadge,
  discountStartsAtIso,
  discountEndsAtIso,
  showDiscountCountdown,
  paymentLabel,
}: PublicRegistrationPricingProps) {
  const [epoch, setEpoch] = useState(0);
  const isFree = paymentMode === RegistrationFlowPaymentMode.FREE;

  const resolved = useMemo(() => {
    void epoch;
    return resolveTimedDiscountPricing({
      paymentAmountRials,
      saleAmountRials,
      discountStartsAt: discountStartsAtIso
        ? new Date(discountStartsAtIso)
        : null,
      discountEndsAt: discountEndsAtIso ? new Date(discountEndsAtIso) : null,
      pricingBadge,
      showDiscountCountdown,
      isFree,
    });
  }, [
    epoch,
    paymentAmountRials,
    saleAmountRials,
    discountStartsAtIso,
    discountEndsAtIso,
    pricingBadge,
    showDiscountCountdown,
    isFree,
  ]);

  if (isFree) {
    return (
      <div className="mt-6 space-y-3">
        <RegistrationPricingCard
          amountRials={0}
          finalAmountRials={0}
          discountRials={0}
          discountPercent={null}
          isFree
          discountActive={false}
          pricingBadge={null}
        />
        <p className="text-sm text-muted">پرداخت: {paymentLabel}</p>
      </div>
    );
  }

  if (paymentAmountRials <= 0) {
    return (
      <div className="mt-6 rounded-2xl border border-border/80 bg-white/80 px-4 py-3 text-sm">
        <p>
          <span className="text-muted">پرداخت: </span>
          {paymentLabel}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <RegistrationPricingCard
        amountRials={resolved.amountRials}
        finalAmountRials={resolved.finalAmountRials}
        discountRials={resolved.discountRials}
        discountPercent={resolved.discountPercent}
        isFree={resolved.finalAmountRials === 0}
        discountActive={resolved.discountActive}
        pricingBadge={resolved.pricingBadge}
      />

      {resolved.discountActive && discountEndsAtIso ? (
        <p className="text-xs leading-6 text-muted">
          پایان تخفیف:{" "}
          <span className="font-medium text-foreground">
            {formatJalaliDateTimeShort(new Date(discountEndsAtIso))}
          </span>
        </p>
      ) : null}

      <DiscountCountdown
        endsAtIso={discountEndsAtIso}
        enabled={resolved.showCountdown}
        onExpired={() => setEpoch((value) => value + 1)}
      />

      <p className="text-sm text-muted">پرداخت: {paymentLabel}</p>
    </div>
  );
}
