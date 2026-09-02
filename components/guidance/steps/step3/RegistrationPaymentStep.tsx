"use client";

/**
 * Guidance Journey Engine — Step 3: Registration & Payment.
 * No payment → no access to remaining steps. Payment is mandatory.
 */

import { useState } from "react";
import { startGuidanceCheckoutAction } from "@/app/portal/student/services/guidance/steps/actions/step3";
import { GuidanceDiscountCodeField } from "@/components/guidance/steps/step3/GuidanceDiscountCodeField";
import { GuidanceStepShell } from "@/components/guidance/steps/GuidanceStepShell";
import { GUIDANCE_PACKAGES } from "@/lib/guidance/journey/packages";
import { formatRials } from "@/lib/registration/format";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

type RegistrationPaymentStepProps = {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  /** Cosmetic only — read server-side from the callback redirect query string. */
  paymentError?: string | null;
};

export function RegistrationPaymentStep({
  sidebarSteps,
  completionPercentage,
  paymentError = null,
}: RegistrationPaymentStepProps) {
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePay(packageCode: string) {
    setError(null);
    setPendingCode(packageCode);
    const result = await startGuidanceCheckoutAction(packageCode);
    if (!result.ok) {
      setError(result.error);
      setPendingCode(null);
      return;
    }
    window.location.assign(result.checkoutUrl);
  }

  return (
    <GuidanceStepShell
      stepId={3}
      stepCount={12}
      title="ثبت‌نام و پرداخت"
      description="بسته مشاوره‌ات را انتخاب کن. بدون پرداخت، ادامه مسیر باز نمی‌شود."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
    >
      {(paymentError || error) && (
        <p className="gpj-banner gpj-banner--error" role="alert">
          {paymentError
            ? "پرداخت ناموفق بود یا لغو شد. لطفاً دوباره تلاش کن."
            : error}
        </p>
      )}

      <p className="gpj-banner gpj-banner--warning">
        دسترسی به جلسه مشاوره، نتایج آزمون و مراحل بعدی فقط پس از پرداخت باز
        می‌شود.
      </p>

      <GuidanceDiscountCodeField />

      <div className="gp-package-grid">
        {GUIDANCE_PACKAGES.map((pkg) => (
          <div
            key={pkg.code}
            className={`gp-package-card${pkg.highlighted ? " gp-package-card--featured" : ""}`}
          >
            {pkg.highlighted ? (
              <p className="gp-package-card__badge">محبوب‌ترین انتخاب</p>
            ) : null}
            <h2 className="gp-package-card__title">{pkg.title}</h2>
            <p className="gp-package-card__desc">{pkg.description}</p>
            <p className="gp-package-card__price">{formatRials(pkg.priceRials)}</p>
            <ul className="gp-package-card__features">
              {pkg.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button
              type="button"
              className="gp-package-card__pay"
              disabled={pendingCode !== null}
              onClick={() => handlePay(pkg.code)}
            >
              {pendingCode === pkg.code ? "در حال انتقال به درگاه…" : "پرداخت و ادامه"}
            </button>
          </div>
        ))}
      </div>
    </GuidanceStepShell>
  );
}
