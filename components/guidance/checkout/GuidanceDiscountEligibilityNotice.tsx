type GuidanceDiscountEligibilityNoticeProps = {
  compact?: boolean;
};

export function GuidanceDiscountEligibilityNotice({
  compact = false,
}: GuidanceDiscountEligibilityNoticeProps) {
  return (
    <section
      className={`guidance-discount-notice${
        compact ? " guidance-discount-notice--compact" : ""
      }`}
      aria-label="شرایط دریافت تخفیف"
    >
      <div className="guidance-discount-notice__head">
        <span
          className="guidance-discount-notice__gift"
          aria-hidden="true"
        >
          🎁
        </span>

        <div>
          <span className="guidance-discount-notice__eyebrow">
            امکان دریافت تخفیف
          </span>

          <h3>
            قبل از پرداخت، شرایط تخفیف خود را بررسی کنید
          </h3>

          <p>
            اگر واجد شرایط دریافت کد تخفیف هستید، لطفاً قبل از
            پرداخت با آموزشگاه تماس بگیرید.
          </p>
        </div>
      </div>

      <div className="guidance-discount-notice__items">
        <article>
          <span
            className="guidance-discount-notice__icon"
            aria-hidden="true"
          >
            🎓
          </span>

          <div>
            <strong>
              دانش‌آموزان سابق قلم‌چی نسیم‌شهر
            </strong>
            <span>۵۰۰ هزار تومان تخفیف</span>
          </div>
        </article>

        <article>
          <span
            className="guidance-discount-notice__icon"
            aria-hidden="true"
          >
            🏅
          </span>

          <div>
            <strong>معدل کتبی بالای ۱۹</strong>
            <span>۲ میلیون تومان تخفیف</span>
          </div>
        </article>

        <article>
          <span
            className="guidance-discount-notice__icon"
            aria-hidden="true"
          >
            💳
          </span>

          <div>
            <strong>پرداخت قبلی در آموزشگاه</strong>
            <span>
              مبلغ پرداخت‌شده از فاکتور نهایی شما کسر می‌شود.
            </span>
          </div>
        </article>
      </div>

      <div className="guidance-discount-notice__footer">
        <span aria-hidden="true">☎</span>
        <p>
          برای دریافت کد تخفیف یا اعمال مبلغ پرداختی قبلی،
          قبل از پرداخت با آموزشگاه تماس بگیرید.
        </p>
      </div>
    </section>
  );
}
