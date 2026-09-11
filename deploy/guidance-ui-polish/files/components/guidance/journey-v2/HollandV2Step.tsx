"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { submitGuidanceV2Step4Action } from "@/app/portal/student/services/guidance/journey/steps/actions/step4";
import type { JourneyV2FormState } from "@/app/portal/student/services/guidance/journey/steps/actions/step1";
import { GuidanceJourneyV2Shell } from "@/components/guidance/journey-v2/GuidanceJourneyV2Shell";
import {
  HOLLAND_QUESTIONS,
  HOLLAND_QUESTION_COUNT,
} from "@/lib/guidance/journey-v2/holland/question-bank";
import type { HollandAnswers } from "@/lib/guidance/journey-v2/holland/scoring";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/steps";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";
import { toPersianDigits } from "@/lib/persian";

const initialState: JourneyV2FormState = {};

const options = [
  { value: 1, label: "اصلاً علاقه ندارم" },
  { value: 2, label: "علاقه کمی دارم" },
  { value: 3, label: "نظری ندارم" },
  { value: 4, label: "علاقه دارم" },
  { value: 5, label: "خیلی علاقه دارم" },
] as const;

function resolveHollandQuestionIcon(text: string, type: string) {
  if (/تعمیر|ابزار|فنی/.test(text)) return "🛠️";
  if (/ماشین|دستگاه|تجهیزات/.test(text)) return "⚙️";
  if (/ساخت|سرهم/.test(text)) return "🔧";
  if (/فضای باز|میدانی/.test(text)) return "🌿";

  if (/علمی|تحقیق/.test(text)) return "🔬";
  if (/آزمایش|فرضیه/.test(text)) return "🧪";
  if (/داده|عدد|شواهد|الگو/.test(text)) return "📊";
  if (/حل مسئله|علت|چرا|چطور/.test(text)) return "🧠";

  if (/طراحی|نقاشی|بصری|رنگ|فرم/.test(text)) return "🎨";
  if (/موسیقی|نمایش|هنری/.test(text)) return "🎵";
  if (/نوشتن|داستان|متن/.test(text)) return "✍️";
  if (/محتوا|ایده|خلاق|ابتکار/.test(text)) return "💡";

  if (/آموزش/.test(text)) return "👨‍🏫";
  if (/کمک|حمایت|همدلی/.test(text)) return "🤝";
  if (/کودکان|نوجوانان|خانواده/.test(text)) return "👨‍👩‍👧";
  if (/گروهی|همکاری/.test(text)) return "👥";

  if (/مذاکره|توافق|متقاعد/.test(text)) return "💬";
  if (/کسب‌وکار|فرصت/.test(text)) return "🚀";
  if (/مدیریت|هدایت|مسئولیت/.test(text)) return "🎯";
  if (/رقابت/.test(text)) return "🏆";

  if (/جدول|فهرست|اطلاعات/.test(text)) return "📋";
  if (/برنامه|زمان‌بندی/.test(text)) return "📅";
  if (/دقت|صحت|جزئیات/.test(text)) return "🔎";
  if (/نظم|مرتب|مرحله‌به‌مرحله/.test(text)) return "✅";

  const fallback: Record<string, string> = {
    R: "🛠️",
    I: "🔬",
    A: "🎨",
    S: "🤝",
    E: "🚀",
    C: "📋",
  };

  return fallback[type] ?? "✨";
}

export function HollandV2Step({
  sidebarSteps,
  completionPercentage,
  planPublicId,
  initialAnswers,
}: {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  planPublicId: string;
  initialAnswers: HollandAnswers;
}) {
  const router = useRouter();

  const [state, action] = useActionState(
    submitGuidanceV2Step4Action,
    initialState,
  );

  const storageKey = `guidance-holland-v2:${planPublicId}`;

  const [answers, setAnswers] =
    useState<HollandAnswers>(initialAnswers);

  const [index, setIndex] = useState(() => {
    const firstUnansweredIndex =
      HOLLAND_QUESTIONS.findIndex((item) => {
        const value = initialAnswers[item.id];

        return !(
          typeof value === "number" &&
          value >= 1 &&
          value <= 5
        );
      });

    return firstUnansweredIndex === -1
      ? HOLLAND_QUESTION_COUNT - 1
      : firstUnansweredIndex;
  });

  const [started, setStarted] = useState(
    Object.keys(initialAnswers).length > 0,
  );

  const [editingCompletedTest, setEditingCompletedTest] =
    useState(false);

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(storageKey);

      if (!cached) return;

      const parsed = JSON.parse(cached) as HollandAnswers;

      setAnswers((current) => ({
        ...parsed,
        ...current,
      }));
    } catch {
      // Ignore invalid browser cache.
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(answers),
      );
    } catch {
      // Browser storage is optional.
    }
  }, [answers, storageKey]);

  useEffect(() => {
    if (!state.ok) return;

    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage errors.
    }

    router.replace(guidanceJourneyV2StepPath(5));
  }, [router, state.ok, storageKey]);

  const question = HOLLAND_QUESTIONS[index]!;

  const answeredCount = useMemo(
    () =>
      HOLLAND_QUESTIONS.filter((item) => {
        const value = answers[item.id];

        return (
          typeof value === "number" &&
          value >= 1 &&
          value <= 5
        );
      }).length,
    [answers],
  );

  const questionProgress = Math.round(
    (answeredCount / HOLLAND_QUESTION_COUNT) * 100,
  );

  const complete =
    answeredCount === HOLLAND_QUESTION_COUNT;

  function choose(value: number) {
    setAnswers((current) => ({
      ...current,
      [question.id]: value,
    }));

    if (index < HOLLAND_QUESTION_COUNT - 1) {
      window.setTimeout(() => {
        setIndex((current) =>
          Math.min(
            current + 1,
            HOLLAND_QUESTION_COUNT - 1,
          ),
        );
      }, 180);
    }
  }

  return (
    <GuidanceJourneyV2Shell
      stepId={4}
      stepCount={18}
      title="آزمون رغبت‌سنجی اختصاصی مهندس ابراهیمی"
      description="۶۰ سؤال هدفمند برای شناخت دقیق‌تر الگوی علایق تحصیلی و شغلی شما."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
    >
      {!started ? (
        <section className="gjv2-holland-intro">
          <div className="gjv2-holland-intro__hero">
            <div className="gjv2-holland-intro__icon">🧭</div>

            <span className="gjv2-holland-intro__eyebrow">
              به خودت فرصت یک انتخاب آگاهانه بده
            </span>

            <h2>
              آزمون رغبت‌سنجی اختصاصی
              <strong> مهندس ابراهیمی</strong>
            </h2>

            <p>
              این رغبت‌سنجی با طراحی و تنظیم تیم تخصصی انتخاب رشته
              مهندس ابراهیمی و بر پایه الگوهای معتبر سنجش علایق
              تحصیلی و شغلی آماده شده است. سؤال‌ها طوری تنظیم
              شده‌اند که فقط نپرسند «چه رشته‌ای دوست داری؟»؛
              بلکه کمک کنند الگوهایی از علایق و ترجیحات تو آشکار
              شوند که شاید تا امروز کمتر به آن‌ها توجه کرده باشی.
            </p>
          </div>

          <div className="gjv2-holland-intro__features">
            <article>
              <span>🧠</span>
              <strong>شناخت علایق</strong>
              <p>کمک می‌کند الگوی علاقه‌های تحصیلی و شغلی خودت را بهتر بشناسی.</p>
            </article>

            <article>
              <span>🧩</span>
              <strong>تحلیل چندبعدی علایق</strong>
              <p>
                پاسخ‌ها با استفاده از شش الگوی اصلی رغبت شغلی
                در چارچوب RIASEC تحلیل می‌شوند.
              </p>
            </article>

            <article>
              <span>⏱️</span>
              <strong>حدود ۸ تا ۱۰ دقیقه</strong>
              <p>۶۰ عبارت کوتاه، ساده و بدون پاسخ درست یا غلط.</p>
            </article>
          </div>

          <div className="gjv2-holland-intro__tip">
            <span>💚</span>
            <div>
              <strong>
                ۶۰ پاسخ صادقانه تو می‌تواند تصویر متفاوتی از
                مسیرهای مناسب‌تر برایت بسازد
              </strong>
              <p>
                زیاد روی هر سؤال مکث نکن. پشت پاسخ‌های تو
                الگوهایی وجود دارد که در نگاه اول دیده نمی‌شوند.
                بعد از تکمیل، پاسخ‌ها تحلیل می‌شوند تا ترکیب
                علایق غالب و سرنخ‌های مهم برای انتخاب رشته
                مشخص شود.
              </p>
            </div>
          </div>

          <div className="gjv2-holland-intro__disclaimer">
            این نتیجه به‌تنهایی تعیین‌کننده رشته نیست؛ در فرآیند
            تخصصی انتخاب رشته، در کنار نمرات، رتبه، توانایی‌ها،
            شرایط فردی و تحلیل مشاور بررسی می‌شود.
          </div>

          <button
            type="button"
            className="gjv2-primary-button gjv2-holland-intro__start"
            onClick={() => setStarted(true)}
          >
            آماده‌ام؛ رغبت‌سنجی را شروع کنیم
            <span>←</span>
          </button>
        </section>
      ) : complete && !editingCompletedTest ? (
        <section className="gjv2-holland-complete">
          <div
            className="gjv2-holland-complete__icon"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>

          <span className="gjv2-holland-complete__eyebrow">
            آزمون قبلاً تکمیل شده است
          </span>

          <h2>
            هر {toPersianDigits(HOLLAND_QUESTION_COUNT)} پاسخ
            شما ثبت شده است
          </h2>

          <p>
            نیازی نیست دوباره سؤال‌ها را یکی‌یکی مرور کنی.
            نیازی نیست دوباره ۶۰ سؤال را مرور کنی.
            می‌توانی مستقیماً نتیجه رغبت‌سنجی را ببینی یا
            در صورت نیاز پاسخ‌هایت را ویرایش کنی.
          </p>

          {state.error ? (
            <p className="gpj-banner gpj-banner--error">
              {state.error}
            </p>
          ) : null}

          <form action={action}>
            {HOLLAND_QUESTIONS.map((item) => (
              <input
                key={item.id}
                type="hidden"
                name={`answer_${item.id}`}
                value={answers[item.id] ?? ""}
              />
            ))}

            <button
              type="submit"
              className="gjv2-primary-button gjv2-holland-complete__result"
            >
              مشاهده نتیجه رغبت‌سنجی
              <span>←</span>
            </button>
          </form>

          <button
            type="button"
            className="gjv2-holland-complete__edit"
            onClick={() => {
              setIndex(0);
              setEditingCompletedTest(true);
            }}
          >
            ویرایش پاسخ‌ها
          </button>

          <button
            type="button"
            className="gjv2-holland-complete__back"
            onClick={() => router.push(guidanceJourneyV2StepPath(3))}
          >
            بازگشت به مرحله قبل
          </button>
        </section>
      ) : (
      <form action={action} className="gjv2-holland">
        {HOLLAND_QUESTIONS.map((item) => (
          <input
            key={item.id}
            type="hidden"
            name={`answer_${item.id}`}
            value={answers[item.id] ?? ""}
          />
        ))}

        <div className="gjv2-holland__top">
          <div>
            <span>
              سؤال {toPersianDigits(index + 1)} از{" "}
              {toPersianDigits(HOLLAND_QUESTION_COUNT)}
            </span>

            <strong>
              {toPersianDigits(answeredCount)} پاسخ ثبت شده
            </strong>
          </div>

          <span>{toPersianDigits(questionProgress)}٪</span>
        </div>

        <div className="gjv2-holland__progress">
          <span
            style={{ width: `${questionProgress}%` }}
          />
        </div>

        {state.error ? (
          <p className="gpj-banner gpj-banner--error">
            {state.error}
          </p>
        ) : null}

        <section className="gjv2-holland__question">
          <div
            className="gjv2-holland__question-icon"
            aria-hidden="true"
          >
            {resolveHollandQuestionIcon(question.text, question.type)}
          </div>

          <p>{question.text}</p>

          <div className="gjv2-holland__options">
            {options.map((option) => {
              const selected =
                answers[question.id] === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`gjv2-holland__option${
                    selected
                      ? " gjv2-holland__option--selected"
                      : ""
                  }`}
                  onClick={() => choose(option.value)}
                >
                  <span className="gjv2-holland__radio">
                    {selected ? "✓" : ""}
                  </span>

                  <strong>{option.label}</strong>
                </button>
              );
            })}
          </div>
        </section>

        <div className="gjv2-holland__navigation">
          <button
            type="button"
            className="gjv2-back-button"
            disabled={index === 0}
            onClick={() =>
              setIndex((current) =>
                Math.max(0, current - 1),
              )
            }
          >
            سؤال قبلی
          </button>

          <div className="gjv2-holland__dots">
            {toPersianDigits(index + 1)}
            <span>/</span>
            {toPersianDigits(HOLLAND_QUESTION_COUNT)}
          </div>

          {index < HOLLAND_QUESTION_COUNT - 1 ? (
            <button
              type="button"
              className="gjv2-primary-button"
              onClick={() =>
                setIndex((current) =>
                  Math.min(
                    HOLLAND_QUESTION_COUNT - 1,
                    current + 1,
                  ),
                )
              }
            >
              سؤال بعدی
            </button>
          ) : (
            <button
              type="submit"
              className="gjv2-primary-button"
              disabled={!complete}
            >
              پایان رغبت‌سنجی و مشاهده نتیجه
            </button>
          )}
        </div>

        {!complete &&
        index === HOLLAND_QUESTION_COUNT - 1 ? (
          <p className="gjv2-holland__remaining">
            هنوز{" "}
            {toPersianDigits(
              HOLLAND_QUESTION_COUNT - answeredCount,
            )}{" "}
            سؤال بدون پاسخ مانده است.
          </p>
        ) : null}

        <p className="gjv2-holland__autosave">
          ✓ پاسخ‌های شما در این دستگاه به‌صورت خودکار حفظ می‌شوند.
        </p>
      </form>
      )}
    </GuidanceJourneyV2Shell>
  );
}
