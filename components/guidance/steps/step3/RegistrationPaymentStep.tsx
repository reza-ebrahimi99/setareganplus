"use client";

/**
 * Guidance Journey Engine — Step 3: Registration & Payment.
 * No payment → no access to remaining steps. Payment is mandatory.
 */

import { useState } from "react";
import { startGuidanceCheckoutAction } from "@/app/portal/student/services/guidance/steps/actions/step3";
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
          پرداخت ناموفق بود یا لغو شد. لطفاً دوباره تلاش کن.
        </p>
      )}

      <p className="gpj-banner gpj-banner--warning">
        دسترسی به جلسه مشاوره، نتایج آزمون و مراحل بعدی فقط پس از پرداخت باز
        می‌شود.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {GUIDANCE_PACKAGES.map((pkg) => (
          <div
            key={pkg.code}
            className="gpj-card"
            data-portal-accent={pkg.highlighted ? "gold" : "purple"}
            style={
              pkg.highlighted
                ? { borderColor: "color-mix(in srgb, var(--gpj-gold) 45%, transparent)" }
                : undefined
            }
          >
            {pkg.highlighted && (
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--gpj-gold)",
                  marginBottom: "0.5rem",
                }}
              >
                محبوب‌ترین انتخاب
              </p>
            )}
            <h2 className="gpj-card__title">{pkg.title}</h2>
            <p className="gpj-card__desc">{pkg.description}</p>
            <p style={{ fontSize: "1.375rem", fontWeight: 800, color: "var(--gpj-purple)", marginBottom: "0.75rem" }}>
              {formatRials(pkg.priceRials)}
            </p>
            <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
              {pkg.features.map((feature) => (
                <li key={feature} style={{ fontSize: "0.8125rem", display: "flex", gap: "0.5rem" }}>
                  <span aria-hidden="true" style={{ color: "var(--gpj-green)" }}>
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="gpj-actions__continue"
              style={{ width: "100%" }}
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
