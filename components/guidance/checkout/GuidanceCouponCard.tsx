"use client";

import { rialToToman } from "@/lib/guidance/discounts/engine";
import { GuidanceDiscountEligibilityNotice } from "@/components/guidance/checkout/GuidanceDiscountEligibilityNotice";

export type GuidanceCouponPreview =
  | {
      ok: true;
      originalAmountRials: number;
      discountRials: number;
      finalAmountRials: number;
    }
  | { ok: false; error: string }
  | null;

function toFaDigits(value: string | number) {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function formatToman(rials: number) {
  return toFaDigits(rialToToman(rials).toLocaleString("en-US"));
}

export function GuidanceCouponCard(props: {
  discountCode: string;
  onCodeChange: (value: string) => void;
  onApply: () => void;
  pending?: boolean;
  preview: GuidanceCouponPreview;
  packagePriceRials: number;
}) {
  const success = props.preview?.ok ? props.preview : null;
  const error = props.preview && !props.preview.ok ? props.preview.error : null;

  return (
    <section className="gjv2-coupon-card" aria-label="کد تخفیف">
      <header className="gjv2-coupon-card__head">
        <p>کد تخفیف</p>
        <strong>اگر کد معتبر دارید، همین‌جا اعمال کنید</strong>
      </header>

      <GuidanceDiscountEligibilityNotice />

      <div className="gjv2-coupon-card__row">
        <label className="gjv2-coupon-card__field">
          <span>کد تخفیف</span>
          <input
            type="text"
            value={props.discountCode}
            onChange={(event) => props.onCodeChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                props.onApply();
              }
            }}
            placeholder="کد تخفیف را وارد کنید"
            autoComplete="off"
            spellCheck={false}
            dir="ltr"
          />
        </label>
        <button
          type="button"
          className="gjv2-coupon-card__apply"
          onClick={props.onApply}
          disabled={props.pending || !props.discountCode.trim()}
        >
          {props.pending ? "در حال بررسی…" : "اعمال کد"}
        </button>
      </div>

      {success ? (
        <div className="gjv2-coupon-card__result gjv2-coupon-card__result--ok" role="status">
          <p>کد تخفیف معتبر است.</p>
          <dl>
            <div>
              <dt>قیمت اصلی</dt>
              <dd>{formatToman(success.originalAmountRials)} تومان</dd>
            </div>
            <div>
              <dt>مبلغ تخفیف</dt>
              <dd>− {formatToman(success.discountRials)} تومان</dd>
            </div>
            <div>
              <dt>مبلغ قابل پرداخت</dt>
              <dd>{formatToman(success.finalAmountRials)} تومان</dd>
            </div>
          </dl>
        </div>
      ) : null}

      {error ? (
        <div className="gjv2-coupon-card__result gjv2-coupon-card__result--err" role="alert">
          {error}
        </div>
      ) : null}

      {!success && !error ? (
        <p className="gjv2-coupon-card__hint">
          قیمت اصلی این پلن {formatToman(props.packagePriceRials)} تومان است. مبلغ نهایی فقط پس از
          اعتبارسنجی سرور محاسبه می‌شود.
        </p>
      ) : null}
    </section>
  );
}
