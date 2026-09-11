"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  previewGuidanceV2Step10DiscountAction,
  submitGuidanceV2Step10Action,
  type GuidanceV2DiscountPreviewState,
  type GuidanceV2Step10State,
} from "@/app/portal/student/services/guidance/journey/steps/actions/step10";
import { GuidanceJourneyV2Nav } from "@/components/guidance/journey-v2/GuidanceJourneyV2Nav";
import { GuidanceJourneyV2Shell } from "@/components/guidance/journey-v2/GuidanceJourneyV2Shell";
import { rialToToman } from "@/lib/guidance/discounts/engine";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/steps";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";
import { GuidanceCouponCard } from "@/components/guidance/checkout/GuidanceCouponCard";
import { packageIncludesArrangement } from "@/lib/guidance/journey-v2/entitlements";
import type {
  GuidanceV2PackageCode,
} from "@/lib/guidance/journey-v2/steps/step10-packages";

type PackageItem = {
  code: GuidanceV2PackageCode;
  title: string;
  subtitle: string;
  priceRials: number;
  requiresPayment: boolean;
  highlighted: boolean;
  features: readonly string[];
};

type PaymentSummary = {
  id: string;
  status: string;
  amountRials: number;
  discountRials: number;
  finalAmountRials: number;
  trackingCode: string | null;
  receiptNumber: string | null;
  paidAt: Date | null;
} | null;

type Props = {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  packages: readonly PackageItem[];
  paymentSummary: PaymentSummary;
  packagePaid: boolean;
  activePackageCode: string | null;
  paymentState?: string | null;
};

const initialState: GuidanceV2Step10State = {};

function toFaDigits(value: string | number) {
  return String(value).replace(
    /\d/g,
    (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)],
  );
}

function formatToman(rials: number) {
  return toFaDigits(rialToToman(rials).toLocaleString("en-US"));
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="27"
      height="27"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 11H5L3 7Z" />
      <path d="M6 21h12" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z" />
      <path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="25"
      height="25"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 10h16v11H4z" />
      <path d="M2.5 6.5h19v4h-19z" />
      <path d="M12 6.5V21" />
      <path d="M12 6.5H8.5a2.5 2.5 0 1 1 2.5-2.5c0 1.5 1 2.5 1 2.5Z" />
      <path d="M12 6.5h3.5A2.5 2.5 0 1 0 13 4c0 1.5-1 2.5-1 2.5Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function packageIcon(
  code: GuidanceV2PackageCode,
) {
  if (code === "PREMIUM") {
    return <CrownIcon />;
  }

  if (code === "SPECIALIZED") {
    return <SparkIcon />;
  }

  if (code === "SMART") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="25"
        height="25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M8.5 15.5A7 7 0 1 1 15.5 15.5C14.5 16.3 14 17 14 18h-4c0-1-.5-1.7-1.5-2.5Z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width="25"
      height="25"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
      <circle cx="6" cy="12" r="3" />
    </svg>
  );
}

export function PackagePaymentV2Step({
  sidebarSteps,
  completionPercentage,
  packages,
  paymentSummary,
  packagePaid,
  activePackageCode,
  paymentState,
}: Props) {
  const router = useRouter();

  const [state, formAction, pending] =
    useActionState(
      submitGuidanceV2Step10Action,
      initialState,
    );

  useEffect(() => {
    if (state.checkoutUrl) {
      window.location.assign(state.checkoutUrl);
    }
  }, [state.checkoutUrl]);

  const initialCode =
    packages.find(
      (item) =>
        item.code === activePackageCode,
    )?.code ??
    packages.find(
      (item) => item.highlighted,
    )?.code ??
    packages[0]?.code ??
    "START";

  const [selectedCode, setSelectedCode] =
    useState<GuidanceV2PackageCode>(
      initialCode,
    );

  const [discountCode, setDiscountCode] =
    useState("");

  const [discountPreview, setDiscountPreview] =
    useState<GuidanceV2DiscountPreviewState>(null);

  const [
    discountPreviewPending,
    setDiscountPreviewPending,
  ] = useState(false);

  async function applyDiscountCode() {
    if (!selectedPackage?.requiresPayment) {
      setDiscountPreview(null);
      return;
    }

    setDiscountPreviewPending(true);

    try {
      const result =
        await previewGuidanceV2Step10DiscountAction(
          selectedCode,
          discountCode,
        );

      setDiscountPreview(result);
    } catch (error) {
      console.error(
        "[guidance.step10] discount preview failed",
        error,
      );

      setDiscountPreview({
        ok: false,
        error:
          "بررسی کد تخفیف انجام نشد. لطفاً دوباره تلاش کنید.",
      });
    } finally {
      setDiscountPreviewPending(false);
    }
  }

  const selectedPackage = useMemo(
    () =>
      packages.find(
        (item) =>
          item.code === selectedCode,
      ) ?? null,
    [packages, selectedCode],
  );

  const hasPaidSummary =
    paymentSummary?.status === "PAID";

  const alreadyPaid =
    (packagePaid || hasPaidSummary) &&
    packageIncludesArrangement(activePackageCode);

  const connecting =
    pending || Boolean(state.checkoutUrl && !state.error);

  const successMessage =
    paymentState === "success"
      ? "پرداخت شما با موفقیت تأیید شد و پلن انتخاب رشته فعال است."
      : null;

  const failureMessage =
    paymentState === "failed"
      ? "پرداخت تأیید نشد. در صورت کسر وجه، وضعیت تراکنش را از همین صفحه پیگیری کنید."
      : paymentState === "cancelled"
        ? "پرداخت لغو شد. هر زمان آماده بودید می‌توانید دوباره اقدام کنید."
        : null;

  return (
    <GuidanceJourneyV2Shell
      stepId={10}
      stepCount={18}
      title="انتخاب پلن و پرداخت"
      description="سطح همراهی موردنظر خود را انتخاب کنید؛ از مسیر رایگان تا همراهی اختصاصی و کامل."
      sidebarSteps={sidebarSteps}
      completionPercentage={
        completionPercentage
      }
    >
      <div className="gjv2-step10">
        {successMessage ? (
          <div
            className="gjv2-banner gjv2-banner--success"
            role="status"
          >
            {successMessage}
          </div>
        ) : null}

        {failureMessage ? (
          <div
            className="gjv2-banner gjv2-banner--error"
            role="alert"
          >
            {failureMessage}
          </div>
        ) : null}

        {state.error ? (
          <div
            className="gjv2-banner gjv2-banner--error"
            role="alert"
          >
            {state.error}
          </div>
        ) : null}

        {alreadyPaid ? (
          <section className="gjv2-step10-active">
            <span className="gjv2-step10-active__icon">
              <ShieldIcon />
            </span>

            <div>
              <strong>
                پلن انتخاب رشته شما فعال است
              </strong>
              <span>
                پرداخت قبلاً ثبت شده است و
                نیازی به پرداخت مجدد ندارید.
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  guidanceJourneyV2StepPath(11),
                )
              }
            >
              ادامه به رزرو جلسه
            </button>
          </section>
        ) : null}

        <section className="gjv2-step10-hero">
          <span className="gjv2-step10-hero__icon">
            <SparkIcon />
          </span>

          <div>
            <strong>
              همراهی متناسب با نیاز شما
            </strong>
            <p>
              همه پلن‌ها بر پایه اطلاعاتی
              هستند که تا این مرحله در پرونده
              انتخاب رشته خود تکمیل کرده‌اید.
              تفاوت پلن‌ها در سطح مشاوره،
              بازبینی و همراهی تخصصی است.
            </p>
          </div>
        </section>

        <form
          action={formAction}
          className="gjv2-step10-form"
        >
          <input
            type="hidden"
            name="packageCode"
            value={selectedCode}
          />

          <input
            type="hidden"
            name="discountCode"
            value={discountCode}
          />

          <div className="gjv2-step10-packages">
            {packages.map((item) => {
              const selected =
                selectedCode === item.code;

              const active =
                activePackageCode ===
                item.code &&
                alreadyPaid;

              return (
                <button
                  key={item.code}
                  type="button"
                  disabled={alreadyPaid}
                  onClick={() => {
                    setSelectedCode(item.code);
                    setDiscountPreview(null);
                  }}
                  className={[
                    "gjv2-step10-package",
                    selected
                      ? "gjv2-step10-package--selected"
                      : "",
                    item.highlighted
                      ? "gjv2-step10-package--featured"
                      : "",
                    active
                      ? "gjv2-step10-package--active"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={selected}
                >
                  {item.highlighted ? (
                    <span className="gjv2-step10-package__recommend">
                      پیشنهاد ما
                    </span>
                  ) : null}

                  {active ? (
                    <span className="gjv2-step10-package__active-badge">
                      پلن فعال
                    </span>
                  ) : null}

                  <span className="gjv2-step10-package__top">
                    <span className="gjv2-step10-package__icon">
                      {packageIcon(
                        item.code,
                      )}
                    </span>

                    <span>
                      <strong>
                        {item.title}
                      </strong>
                      <small>
                        {item.subtitle}
                      </small>
                    </span>
                  </span>

                  <span className="gjv2-step10-package__price">
                    {item.requiresPayment ? (
                      <>
                        <b>
                          {formatToman(
                            item.priceRials,
                          )}
                        </b>
                        <small>
                          تومان
                        </small>
                      </>
                    ) : (
                      <b>رایگان</b>
                    )}
                  </span>

                  <span className="gjv2-step10-package__divider" />

                  <span className="gjv2-step10-package__features">
                    {item.features.map(
                      (feature) => (
                        <span
                          key={feature}
                          className="gjv2-step10-package__feature"
                        >
                          <i>
                            <CheckIcon />
                          </i>
                          <span>
                            {feature}
                          </span>
                        </span>
                      ),
                    )}
                  </span>

                  <span className="gjv2-step10-package__select">
                    <i
                      className={
                        selected
                          ? "is-selected"
                          : ""
                      }
                    >
                      {selected ? (
                        <CheckIcon />
                      ) : null}
                    </i>

                    <span>
                      {selected
                        ? "انتخاب شده"
                        : "انتخاب این پلن"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {!alreadyPaid &&
          selectedPackage?.requiresPayment ? (
            <GuidanceCouponCard
              discountCode={discountCode}
              onCodeChange={(value) => {
                setDiscountCode(value);
                setDiscountPreview(null);
              }}
              onApply={() => {
                void applyDiscountCode();
              }}
              pending={discountPreviewPending}
              preview={discountPreview}
              packagePriceRials={selectedPackage.priceRials}
            />
          ) : null}

          {!alreadyPaid &&
          selectedPackage ? (
            <section className="gjv2-step10-summary">
              <div>
                <span>
                  پلن انتخابی
                </span>
                <strong>
                  {selectedPackage.title}
                </strong>
              </div>

              <div>
                <span>
                  مبلغ پلن
                </span>
                <strong>
                  {selectedPackage.requiresPayment
                    ? `${formatToman(
                        selectedPackage.priceRials,
                      )} تومان`
                    : "رایگان"}
                </strong>
              </div>

              {discountPreview?.ok &&
              discountPreview.packageCode ===
                selectedCode ? (
                <>
                  <div>
                    <span>قیمت اصلی</span>
                    <strong>
                      {formatToman(
                        discountPreview.originalAmountRials ??
                          selectedPackage.priceRials,
                      )}{" "}
                      تومان
                    </strong>
                  </div>
                  <div className="gjv2-step10-summary__discount">
                    <span>تخفیف</span>
                    <strong>
                      − {formatToman(discountPreview.discountRials)} تومان
                    </strong>
                  </div>
                </>
              ) : null}

              <div className="gjv2-step10-summary__final">
                <span>
                  {selectedPackage.requiresPayment
                    ? "مبلغ قابل پرداخت"
                    : "هزینه ادامه مسیر"}
                </span>

                <strong>
                  {selectedPackage.requiresPayment
                    ? `${formatToman(
                        discountPreview?.ok &&
                        discountPreview.packageCode ===
                          selectedCode
                          ? discountPreview.finalAmountRials
                          : selectedPackage.priceRials,
                      )} تومان`
                    : "۰ تومان"}
                </strong>
              </div>

              {selectedPackage.requiresPayment &&
              discountCode.trim() &&
              !discountPreview?.ok ? (
                <small>
                  برای مشاهده مبلغ نهایی، ابتدا
                  کد تخفیف را اعمال کنید.
                </small>
              ) : null}
            </section>
          ) : null}

          {!alreadyPaid ? (
            <GuidanceJourneyV2Nav
              previous={{
                label: "بازگشت به اولویت‌ها",
                onClick: () => router.push(guidanceJourneyV2StepPath(9)),
              }}
              next={{
                type: "submit",
                label: selectedPackage?.requiresPayment
                  ? "پرداخت امن"
                  : "انتخاب پلن رایگان و ادامه",
                disabled: connecting || !selectedPackage,
                pending: connecting,
                pendingLabel: selectedPackage?.requiresPayment
                  ? "در حال اتصال به درگاه امن…"
                  : "در حال ثبت پلن رایگان…",
              }}
            />
          ) : null}
        </form>

        <div className="gjv2-step10-security">
          <ShieldIcon />
          <span>
            مبلغ پرداختی و تخفیف در سرور
            کنترل می‌شود و اطلاعات مالی از
            مرورگر پذیرفته نمی‌شود.
          </span>
        </div>
      </div>
    </GuidanceJourneyV2Shell>
  );
}
