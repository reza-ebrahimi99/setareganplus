"use client";

import {
  useActionState,
  useEffect,
  useMemo,
} from "react";
import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { startHollandReportCheckoutAction } from "@/app/portal/student/services/guidance/journey/steps/actions/holland-payment";
import { submitGuidanceV2Step5Action } from "@/app/portal/student/services/guidance/journey/steps/actions/step5";
import type { JourneyV2FormState } from "@/app/portal/student/services/guidance/journey/steps/actions/step1";
import { GuidanceJourneyV2Nav } from "@/components/guidance/journey-v2/GuidanceJourneyV2Nav";
import { GuidanceJourneyV2Shell } from "@/components/guidance/journey-v2/GuidanceJourneyV2Shell";
import type {
  HollandResult,
  HollandScore,
} from "@/lib/guidance/journey-v2/holland/scoring";
import {
  HOLLAND_PROFILES,
  hollandScoreIntensity,
  type HollandType,
} from "@/lib/guidance/journey-v2/holland/profiles";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/steps";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";
import { toPersianDigits } from "@/lib/persian";

const initialState: JourneyV2FormState = {};
const checkoutInitialState: { error?: string } = {};

function percentLabel(value: number) {
  return `${toPersianDigits(value)}٪`;
}

export function HollandResultV2Step({
  sidebarSteps,
  completionPercentage,
  result,
  reportUnlocked,
  unlockSource,
}: {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  result: HollandResult;
  reportUnlocked: boolean;
  unlockSource: "PACKAGE" | "PAYMENT" | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, action, pending] = useActionState(
    submitGuidanceV2Step5Action,
    initialState,
  );

  const [
    checkoutState,
    checkoutAction,
    checkoutPending,
  ] = useActionState(
    startHollandReportCheckoutAction,
    checkoutInitialState,
  );

  useEffect(() => {
    if (!state.ok) return;
    router.replace(guidanceJourneyV2StepPath(6));
  }, [router, state.ok]);

  const sortedScores = useMemo(
    () =>
      [...result.scores].sort(
        (a, b) => b.normalized - a.normalized,
      ),
    [result.scores],
  );

  const dominantScores = sortedScores.slice(0, 3);
  const paymentStatus = searchParams.get("payment");
  const paymentSuccess =
    paymentStatus === "success" && reportUnlocked;
  const paymentCancelled = paymentStatus === "cancelled";
  const paymentFailed = paymentStatus === "failed";

  const uniqueFields = Array.from(
    new Set(
      dominantScores.flatMap(
        (score) => HOLLAND_PROFILES[score.type].fields,
      ),
    ),
  );

  return (
    <GuidanceJourneyV2Shell
      stepId={5}
      stepCount={18}
      title="نتیجه رغبت‌سنجی اختصاصی مهندس ابراهیمی"
      description="این نتیجه یکی از سرنخ‌های مهم برای شناخت بهتر علایق تحصیلی و شغلی توست."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
    >
      <div className="gjv2-holland-result">
        {paymentSuccess ? (
          <div className="gjv2-holland-report__success">
            <span>✓</span>
            <div>
              <strong>پرداخت موفق؛ گزارش کامل فعال شد</strong>
              <p>
                پرداخت با موفقیت تأیید شده و دسترسی این گزارش
                از این پس در پرونده انتخاب رشته شما باقی می‌ماند.
              </p>
            </div>
          </div>
        ) : null}

        {paymentCancelled && !reportUnlocked ? (
          <div className="gjv2-holland-report__payment-message gjv2-holland-report__payment-message--cancelled">
            <span>!</span>
            <div>
              <strong>پرداخت تکمیل نشد</strong>
              <p>
                فرایند پرداخت لغو شده است. اگر مبلغی از حساب شما
                کسر شده باشد، وضعیت تراکنش از طریق درگاه و سوابق
                پرداخت قابل پیگیری است.
              </p>
            </div>
          </div>
        ) : null}

        {paymentFailed && !reportUnlocked ? (
          <div className="gjv2-holland-report__payment-message gjv2-holland-report__payment-message--failed">
            <span>!</span>
            <div>
              <strong>پرداخت تأیید نشد</strong>
              <p>
                پرداخت این تلاش تأیید نشده است. می‌توانید دوباره
                از همین صفحه برای فعال‌سازی گزارش اقدام کنید.
              </p>
            </div>
          </div>
        ) : null}

        {!reportUnlocked ? (
          <section className="gjv2-holland-gate">
            <div
              className="gjv2-holland-gate__preview"
              aria-hidden="true"
            >
              <div className="gjv2-holland-gate__preview-head">
                <div className="gjv2-holland-gate__fake-code">
                  <span>R</span>
                  <span>I</span>
                  <span>A</span>
                </div>

                <div className="gjv2-holland-gate__preview-title">
                  <strong>ترکیب علایق غالب شما</strong>
                  <span>گزارش اختصاصی آماده شده است</span>
                </div>
              </div>

              <div className="gjv2-holland-gate__fake-bars">
                <div><b>R</b><i style={{ width: "84%" }} /></div>
                <div><b>I</b><i style={{ width: "69%" }} /></div>
                <div><b>A</b><i style={{ width: "57%" }} /></div>
                <div><b>S</b><i style={{ width: "45%" }} /></div>
                <div><b>E</b><i style={{ width: "36%" }} /></div>
                <div><b>C</b><i style={{ width: "28%" }} /></div>
              </div>

              <div className="gjv2-holland-gate__fake-insights">
                <div>
                  <strong>نقاط قوت و سبک کاری</strong>
                  <span />
                  <span />
                  <span />
                </div>
                <div>
                  <strong>مسیرهای تحصیلی پیشنهادی</strong>
                  <span />
                  <span />
                  <span />
                </div>
                <div>
                  <strong>محیط‌های مناسب شما</strong>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>

            <div className="gjv2-holland-gate__overlay">
              <div
                className="gjv2-holland-gate__lock"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M7 10V8a5 5 0 0 1 10 0v2" />
                  <rect
                    x="5"
                    y="10"
                    width="14"
                    height="10"
                    rx="3"
                  />
                  <path d="M12 14v2" />
                </svg>
              </div>

              <span className="gjv2-holland-gate__eyebrow">
                نتیجه رغبت‌سنجی اختصاصی شما آماده است
              </span>

              <h2>
                برای مشاهده نتیجه، یکی از مسیرهای زیر را انتخاب کن
              </h2>

              <p className="gjv2-holland-gate__intro">
                تحلیل الگوی علایق، امتیاز شش بُعد RIASEC و گزارش
                اختصاصی شما آماده شده است. مشاهده گزارش برای
                ادامه مسیر انتخاب رشته اجباری نیست.
              </p>

              <div className="gjv2-holland-gate__options">
                <article className="gjv2-holland-gate__option gjv2-holland-gate__option--plan">
                  <span className="gjv2-holland-gate__option-badge">
                    پیشنهاد ستارگان پلاس
                  </span>

                  <h3>
                    پلن انتخاب رشته + گزارش رایگان رغبت‌سنجی
                  </h3>

                  <p>
                    با خرید هر یک از پلن‌های انتخاب رشته،
                    گزارش کامل رغبت‌سنجی بدون هزینه جداگانه برای
                    شما فعال می‌شود.
                  </p>

                  <Link
                    href="/portal/student/services/guidance?view=plans"
                    className="gjv2-holland-gate__plans-link"
                  >
                    مشاهده پلن‌های انتخاب رشته
                  </Link>
                </article>

                <article className="gjv2-holland-gate__option gjv2-holland-gate__option--report">
                  <span className="gjv2-holland-gate__option-badge">
                    فقط گزارش رغبت‌سنجی
                  </span>

                  <h3>
                    {toPersianDigits("۲۵۰٬۰۰۰")}{" "}
                    <small>تومان</small>
                  </h3>

                  <p>
                    اگر فعلاً قصد خرید پلن انتخاب رشته را
                    نداری، می‌توانی فقط گزارش کامل رغبت‌سنجی را
                    فعال کنی.
                  </p>

                  <form action={checkoutAction}>
                    <button
                      type="submit"
                      disabled={checkoutPending}
                    >
                      {checkoutPending
                        ? "در حال اتصال به درگاه..."
                        : "پرداخت و مشاهده نتیجه"}
                    </button>
                  </form>
                </article>
              </div>

              {checkoutState.error ? (
                <p className="gpj-banner gpj-banner--error">
                  {checkoutState.error}
                </p>
              ) : null}

              <div className="gjv2-holland-gate__skip">
                <span>
                  فعلاً نمی‌خواهی نتیجه را ببینی؟
                </span>

                <form action={action}>
                  <button
                    type="submit"
                    disabled={pending}
                  >
                    {pending
                      ? "در حال ثبت..."
                      : "فعلاً نتیجه را نمی‌خواهم؛ ادامه مسیر"}
                  </button>
                </form>
              </div>
            </div>
          </section>
        ) : (
          <>
            {unlockSource === "PACKAGE" ? (
              <div className="gjv2-holland-gate__included">
                <span>✓</span>
                <div>
                  <strong>
                    گزارش کامل رغبت‌سنجی برای شما فعال است
                  </strong>
                  <p>
                    این گزارش به‌عنوان بخشی از پلن انتخاب
                    رشته شما فعال است و هزینه جداگانه‌ای ندارد.
                  </p>
                </div>
              </div>
            ) : null}

        <section className="gjv2-holland-result__hero">
          <span className="gjv2-holland-result__eyebrow">
            الگوی سه‌حرفی رغبت شما
          </span>

          <div
            className="gjv2-holland-result__code"
            dir="ltr"
          >
            {result.code.split("").map((letter, index) => {
              const type = letter as HollandType;
              const profile = HOLLAND_PROFILES[type];

              return (
                <span key={`${letter}-${index}`}>
                  <small>{profile.icon}</small>
                  {letter}
                </span>
              );
            })}
          </div>

          <h2>
            ترکیب غالب علایق تو:{" "}
            {dominantScores
              .map(
                (score) =>
                  HOLLAND_PROFILES[score.type].title,
              )
              .join("، ")}
          </h2>

          <p>
            این سه تیپ بیشترین امتیاز را در پاسخ‌های تو
            داشته‌اند. پایین‌تر می‌توانی تصویر کامل هر شش
            تیپ را ببینی.
          </p>
        </section>

        <section className="gjv2-holland-result__scores">
          <div className="gjv2-holland-result__section-heading">
            <div>
              <span>نمای کلی</span>
              <h3>امتیاز شش بُعد رغبت شغلی</h3>
            </div>

            <span>RIASEC</span>
          </div>

          <div className="gjv2-holland-result__bars">
            {sortedScores.map((score: HollandScore) => {
              const profile =
                HOLLAND_PROFILES[score.type];

              return (
                <article
                  key={score.type}
                  className="gjv2-holland-result__bar-row"
                >
                  <div className="gjv2-holland-result__bar-label">
                    <span>{profile.icon}</span>

                    <div>
                      <strong>
                        {score.type} — {profile.title}
                      </strong>
                      <small>{profile.shortTitle}</small>
                    </div>
                  </div>

                  <div className="gjv2-holland-result__bar-track">
                    <span
                      style={{
                        width: `${score.normalized}%`,
                      }}
                    />
                  </div>

                  <strong className="gjv2-holland-result__percent">
                    {percentLabel(score.normalized)}
                  </strong>
                </article>
              );
            })}
          </div>
        </section>

        <section className="gjv2-holland-result__dominant">
          <div className="gjv2-holland-result__section-heading">
            <div>
              <span>سه تیپ اصلی</span>
              <h3>
                این نتیجه درباره علایق تو چه می‌گوید؟
              </h3>
            </div>
          </div>

          <div className="gjv2-holland-result__dominant-grid">
            {dominantScores.map((score, index) => {
              const profile =
                HOLLAND_PROFILES[score.type];

              return (
                <article
                  key={score.type}
                  className="gjv2-holland-result__profile"
                >
                  <div className="gjv2-holland-result__profile-top">
                    <span>{profile.icon}</span>

                    <small>
                      تیپ غالب{" "}
                      {toPersianDigits(index + 1)}
                    </small>
                  </div>

                  <h4>
                    {score.type} — {profile.title}
                  </h4>

                  <strong>
                    {percentLabel(score.normalized)}
                  </strong>

                  <p>{profile.summary}</p>

                  <div>
                    <span>محیط‌های مناسب‌تر</span>
                    <p>{profile.environment}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="gjv2-holland-result__alignment">
          <div className="gjv2-holland-result__alignment-icon">
            🧭
          </div>

          <div>
            <span>سرنخ‌های اولیه برای بررسی بیشتر</span>
            <h3>حوزه‌های همسو با الگوی علاقه تو</h3>

            <p>
              این‌ها پیشنهادهای اولیه هستند؛ نه نسخه قطعی
              انتخاب رشته. در ادامه مسیر، این علایق کنار
              نمرات، رتبه، توانایی‌ها و شرایط فردی بررسی
              می‌شوند.
            </p>

            <div className="gjv2-holland-result__chips">
              {uniqueFields.map((field) => (
                <span key={field}>{field}</span>
              ))}
            </div>
          </div>
        </section>

        <section
          className={`gjv2-holland-report ${
            reportUnlocked
              ? "gjv2-holland-report--unlocked"
              : "gjv2-holland-report--locked"
          }`}
        >
          <div className="gjv2-holland-report__head">
            <div className="gjv2-holland-report__head-icon">
              {reportUnlocked ? "📑" : "🔒"}
            </div>

            <div>
              <span>
                گزارش تحلیلی کامل رغبت‌سنجی
              </span>

              <h3>
                تحلیل جامع الگوی رغبت شما
              </h3>

              <p>
                تفسیر دقیق‌تر سه تیپ اصلی، نقاط قوت،
                محیط‌های مناسب، سبک یادگیری و نکات مهمی
                که بهتر است در انتخاب رشته در نظر بگیری.
              </p>
            </div>

            {reportUnlocked ? (
              <span className="gjv2-holland-report__badge">
                فعال
              </span>
            ) : (
              <span className="gjv2-holland-report__badge gjv2-holland-report__badge--locked">
                گزارش ویژه
              </span>
            )}
          </div>

          {reportUnlocked ? (
            <div className="gjv2-holland-report__content">
              <div className="gjv2-holland-report__summary">
                <div>
                  <small>کد غالب</small>
                  <strong dir="ltr">
                    {result.code}
                  </strong>
                </div>

                <div>
                  <small>تیپ اول</small>
                  <strong>
                    {
                      HOLLAND_PROFILES[
                        dominantScores[0].type
                      ].title
                    }
                  </strong>
                </div>

                <div>
                  <small>وضعیت گزارش</small>
                  <strong>
                    {unlockSource === "PACKAGE"
                      ? "شامل پلن انتخاب رشته"
                      : "خریداری‌شده"}
                  </strong>
                </div>
              </div>

              <div className="gjv2-holland-report__analysis">
                {dominantScores.map((score, index) => {
                  const profile =
                    HOLLAND_PROFILES[score.type];

                  return (
                    <article
                      key={score.type}
                      className="gjv2-holland-report__analysis-card"
                    >
                      <div className="gjv2-holland-report__analysis-title">
                        <span>{profile.icon}</span>
                        <div>
                          <small>
                            تیپ غالب{" "}
                            {toPersianDigits(index + 1)}
                          </small>
                          <h4>
                            {score.type} — {profile.title}
                          </h4>
                        </div>
                        <strong>
                          {percentLabel(score.normalized)}
                        </strong>
                      </div>

                      <p>{profile.summary}</p>

                      <div className="gjv2-holland-report__detail-grid">
                        <div>
                          <span>شدت این علاقه</span>
                          <strong>
                            {hollandScoreIntensity(
                              score.normalized,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>محیط مطلوب‌تر</span>
                          <p>{profile.environment}</p>
                        </div>

                        <div>
                          <span>سبک یادگیری</span>
                          <p>{profile.studyStyle}</p>
                        </div>

                        <div>
                          <span>سبک کاری</span>
                          <p>{profile.workStyle}</p>
                        </div>
                      </div>

                      <div className="gjv2-holland-report__lists">
                        <div>
                          <strong>نقاط قوت احتمالی</strong>
                          <ul>
                            {profile.strengths.map(
                              (item) => (
                                <li key={item}>
                                  {item}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>

                        <div>
                          <strong>
                            نکاتی که باید بررسی شوند
                          </strong>
                          <ul>
                            {profile.watchouts.map(
                              (item) => (
                                <li key={item}>
                                  {item}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <section className="gjv2-holland-report__all-six">
                <div>
                  <span>نمای کامل الگوی رغبت شغلی</span>
                  <h4>
                    هر شش بُعد را کنار هم ببین
                  </h4>
                </div>

                <div className="gjv2-holland-report__six-grid">
                  {sortedScores.map((score) => {
                    const profile =
                      HOLLAND_PROFILES[score.type];

                    return (
                      <div key={score.type}>
                        <span>{profile.icon}</span>
                        <strong>
                          {score.type} — {profile.title}
                        </strong>
                        <small>
                          {percentLabel(
                            score.normalized,
                          )}
                          {" · "}
                          {hollandScoreIntensity(
                            score.normalized,
                          )}
                        </small>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="gjv2-holland-report__advisor">
                <div>🧭</div>

                <div>
                  <span>
                    برای جلسه مشاوره نگه‌دار
                  </span>
                  <h4>
                    این گزارش بخشی از پرونده
                    انتخاب رشته توست
                  </h4>
                  <p>
                    مشاور این نتیجه را کنار نمرات،
                    سوابق تحصیلی، نتیجه کنکور،
                    اولویت رشته‌ها و شهرها بررسی
                    می‌کند. بهتر است گزارش را برای
                    جلسه مشاوره ذخیره یا چاپ کنی.
                  </p>
                </div>
              </section>

              <div className="gjv2-holland-report__print-actions">
                <button
                  type="button"
                  className="gjv2-holland-report__print"
                  onClick={() => window.print()}
                >
                  🖨️ چاپ / ذخیره PDF گزارش
                </button>

                <span>
                  در پنجره چاپ مرورگر، گزینه
                  «Save as PDF / ذخیره به صورت PDF»
                  را انتخاب کن.
                </span>
              </div>
            </div>
          ) : (
            <div className="gjv2-holland-report__locked-content">
              <div className="gjv2-holland-report__preview">
                <div>
                  <span>✓</span>
                  تحلیل تفصیلی سه تیپ غالب
                </div>
                <div>
                  <span>✓</span>
                  نقاط قوت و محیط‌های مناسب
                </div>
                <div>
                  <span>✓</span>
                  سبک یادگیری و سبک کاری
                </div>
                <div>
                  <span>✓</span>
                  نکات مهم برای تصمیم انتخاب رشته
                </div>
                <div>
                  <span>✓</span>
                  نسخه مناسب چاپ و ذخیره PDF
                </div>
              </div>

              <div className="gjv2-holland-report__purchase">
                <div>
                  <small>هزینه فعال‌سازی گزارش کامل</small>
                  <strong>
                    {toPersianDigits("۲۵۰٬۰۰۰")}{" "}
                    <span>تومان</span>
                  </strong>
                  <p>
                    خرید گزارش اختیاری است و برای
                    ادامه مراحل انتخاب رشته اجباری
                    نیست.
                  </p>
                </div>

                <form action={checkoutAction}>
                  <button
                    type="submit"
                    disabled={checkoutPending}
                  >
                    {checkoutPending
                      ? "در حال اتصال به درگاه..."
                      : "فعال‌سازی گزارش کامل"}
                  </button>
                </form>
              </div>

              {checkoutState.error ? (
                <p className="gpj-banner gpj-banner--error">
                  {checkoutState.error}
                </p>
              ) : null}
            </div>
          )}
        </section>

          </>
        )}

        <section className="gjv2-holland-result__advisor-note">
          <span>💚</span>

          <div>
            <strong>
              نتیجه رغبت‌سنجی، تصمیم نهایی انتخاب رشته نیست
            </strong>

            <p>
              این رغبت‌سنجی یکی از داده‌های تخصصی پرونده توست.
              تصمیم نهایی بعد از کنار هم قرار دادن
              علایق، توانایی‌ها، سوابق تحصیلی، نتیجه
              کنکور و تحلیل مشاور انجام می‌شود.
            </p>
          </div>
        </section>

        {state.error ? (
          <p className="gpj-banner gpj-banner--error">
            {state.error}
          </p>
        ) : null}

        <form action={action}>
          <GuidanceJourneyV2Nav
            previous={{
              label: "بازگشت به آزمون رغبت‌سنجی",
              onClick: () => router.push(guidanceJourneyV2StepPath(4)),
            }}
            next={
              reportUnlocked
                ? {
                    label: "نتیجه را دیدم؛ ادامه مسیر",
                    pending,
                    pendingLabel: "در حال ثبت...",
                  }
                : undefined
            }
          />
        </form>
      </div>
    </GuidanceJourneyV2Shell>
  );
}
