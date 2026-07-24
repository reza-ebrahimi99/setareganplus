"use client";

import { formatTomansFromRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";

export type RegistrationPricingCardProps = {
  amountRials: number;
  finalAmountRials: number;
  discountRials: number;
  discountPercent: number | null;
  isFree: boolean;
  discountActive: boolean;
  pricingBadge: string | null;
  className?: string;
};

export function RegistrationPricingCard({
  amountRials,
  finalAmountRials,
  discountRials,
  discountPercent,
  isFree,
  discountActive,
  pricingBadge,
  className = "",
}: RegistrationPricingCardProps) {
  const showStrike =
    discountActive && discountRials > 0 && finalAmountRials < amountRials;

  return (
    <div
      className={`registration-pricing-card overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-white via-slate-50 to-amber-50/40 p-4 shadow-[0_8px_28px_rgb(15_23_42_/_0.06)] sm:p-5 ${className}`}
      dir="rtl"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted">مبلغ قابل پرداخت</p>
          {showStrike ? (
            <p className="text-sm text-muted line-through decoration-rose-400/80">
              {formatTomansFromRials(amountRials)}
            </p>
          ) : null}
          <p className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            {isFree ? "رایگان" : formatTomansFromRials(finalAmountRials)}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {pricingBadge ? (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
              {pricingBadge}
            </span>
          ) : null}
          {isFree ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
              <span aria-hidden="true">🎁</span>
              رایگان
            </span>
          ) : null}
          {!isFree && discountActive && discountPercent != null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-800">
              <span aria-hidden="true">🔥</span>
              {toPersianDigits(discountPercent)}٪ تخفیف
            </span>
          ) : null}
        </div>
      </div>

      {!isFree && discountActive && discountRials > 0 ? (
        <p className="mt-3 text-sm leading-7 text-emerald-800">
          شما {formatTomansFromRials(discountRials)} تخفیف گرفته‌اید.
        </p>
      ) : null}
    </div>
  );
}
