"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  submitGuidanceV2Step4Action,
  type GuidanceV2Step4FormState,
} from "@/app/portal/student/services/guidance/journey/steps/actions/step4";

import { GuidanceJourneyV2Shell } from "@/components/guidance/journey-v2/GuidanceJourneyV2Shell";

import {
  ASSESSMENT_QUESTIONS,
} from "@/lib/guidance/journey/assessment/question-bank";

import type {
  AssessmentAnswers,
} from "@/lib/guidance/journey/assessment/scoring";

import {
  guidanceJourneyV2StepPath,
} from "@/lib/guidance/journey-v2/catalog";

import type {
  GuidanceJourneySidebarStep,
} from "@/lib/guidance/journey/types";

import { toPersianDigits } from "@/lib/persian";

const initialState: GuidanceV2Step4FormState = {};

const OPTIONS = [
  { value: 1, label: "کاملاً مخالفم" },
  { value: 2, label: "مخالفم" },
  { value: 3, label: "نظری ندارم" },
  { value: 4, label: "موافقم" },
  { value: 5, label: "کاملاً موافقم" },
] as const;

function resolveQuestionIcon(
  text: string,
  categoryId: string,
): string {
  if (/ابزار|دستگاه|فنی|نرم‌افزار|سیستم/.test(text)) return "🛠️";
  if (/عدد|منطقی|داده|تحلیل|شواهد/.test(text)) return "📊";
  if (/تحقیق|علت|پدیده|آزمایش/.test(text)) return "🔬";
  if (/طراحی|خلاق|ایده|ساخت/.test(text)) return "🎨";
  if (/آموزش|کمک|همراهی|دیگران/.test(text)) return "🤝";
  if (/گروه|جمع|افراد تازه/.test(text)) return "👥";
  if (/مدیریت|مسئولیت|هماهنگ/.test(text)) return "🎯";
  if (/کسب.?و.?کار|مذاکره|پول|ریسک/.test(text)) return "🚀";
  if (/محیط|طبیعت|فضای باز|میدانی/.test(text)) return "🌿";
  if (/یادگیری|مطالعه|تمرین/.test(text)) return "📚";
  if (/آینده|هدف|مسیر/.test(text)) return "🧭";
  if (/فشار|ضرب.?الاجل|اشتباه/.test(text)) return "⚡";

  const fallback: Record<string, string> = {
    personality: "🧠",
    decision_making: "⚖️",
    work_style: "✅",
    learning_style: "📚",
    interests: "✨",
    future_goals: "🧭",
    social: "👥",
    helping: "🤝",
    leadership: "🎯",
    research: "🔬",
    technical: "🛠️",
    creativity: "🎨",
    business: "🚀",
    environmental: "🌿",
    stress_tolerance: "⚡",
  };

  return fallback[categoryId] ?? "✨";
}

export function HollandV2Step({
  sidebarSteps,
  completionPercentage,
  initialAnswers,
}: {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  initialAnswers: AssessmentAnswers;
}) {
  const router = useRouter();

  const [state, action, pending] = useActionState(
    submitGuidanceV2Step4Action,
    initialState,
  );

  const [answers, setAnswers] =
    useState<AssessmentAnswers>(initialAnswers);

  const firstUnansweredIndex = useMemo(() => {
    const index = ASSESSMENT_QUESTIONS.findIndex((question) => {
      const value = initialAnswers[question.id];

      return !(
        typeof value === "number" &&
        value >= 1 &&
        value <= 5
      );
    });

    return index === -1
      ? ASSESSMENT_QUESTIONS.length - 1
      : index;
  }, [initialAnswers]);

  const [index, setIndex] =
    useState(firstUnansweredIndex);

  const [started, setStarted] = useState(
    Object.keys(initialAnswers).length > 0,
  );

  const [editingCompletedTest, setEditingCompletedTest] =
    useState(false);

  useEffect(() => {
    if (state.ok) {
      router.replace(guidanceJourneyV2StepPath(5));
    }
  }, [router, state.ok]);

  const question = ASSESSMENT_QUESTIONS[index];

  const answeredCount = useMemo(
    () =>
      ASSESSMENT_QUESTIONS.filter((item) => {
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
    (answeredCount / ASSESSMENT_QUESTIONS.length) * 100,
  );

  const complete =
    answeredCount === ASSESSMENT_QUESTIONS.length;

  const currentAnswered =
    question &&
    typeof answers[question.id] === "number";

  function choose(value: number) {
    if (!question) return;

    setAnswers((current) => ({
      ...current,
      [question.id]: value,
    }));

    if (index < ASSESSMENT_QUESTIONS.length - 1) {
      window.setTimeout(() => {
        setIndex((current) =>
          Math.min(
            current + 1,
            ASSESSMENT_QUESTIONS.length - 1,
          ),
        );
      }, 180);
    }
  }

  return (
    <GuidanceJourneyV2Shell
      stepId={4}
      stepCount={18}
      title="آزمون رغبت‌سنجی اختصاصی"
      description="۶۰ سؤال هدفمند برای شناخت دقیق‌تر علایق، ویژگی‌ها و ترجیحات تحصیلی و شغلی شما."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
    >
      {!started ? (
        <section className="gjv2-holland-intro">
          <div className="gjv2-holland-intro__hero">
            <div className="gjv2-holland-intro__icon">
              🧭
            </div>

            <span className="gjv2-holland-intro__eyebrow">
              به خودت فرصت یک انتخاب آگاهانه بده
            </span>

            <h2>
              آزمون رغبت‌سنجی اختصاصی
              <strong> مهندس ابراهیمی</strong>
            </h2>

            <p>
              این سنجش کمک می‌کند الگوی علایق، سبک تصمیم‌گیری،
              یادگیری، تعامل اجتماعی، توانمندی‌های فنی و خلاقانه
              و ترجیحات آینده خودت را بهتر بشناسی.
            </p>
          </div>

          <div className="gjv2-holland-intro__features">
            <article>
              <span>🧠</span>
              <strong>شناخت بهتر خودت</strong>
              <p>
                تصویری چندبعدی از علایق و ترجیحات تو می‌سازد.
              </p>
            </article>

            <article>
              <span>🧩</span>
              <strong>تحلیل چندبعدی</strong>
              <p>
                فقط علاقه به رشته را نمی‌سنجد و چند ویژگی مهم را
                کنار هم بررسی می‌کند.
              </p>
            </article>

            <article>
              <span>⏱️</span>
              <strong>حدود ۸ تا ۱۰ دقیقه</strong>
              <p>
                ۶۰ عبارت کوتاه، ساده و بدون پاسخ درست یا غلط.
              </p>
            </article>
          </div>

          <div className="gjv2-holland-intro__tip">
            <span>💚</span>

            <div>
              <strong>
                بهترین نتیجه با پاسخ صادقانه به دست می‌آید
              </strong>

              <p>
                زیاد روی هر سؤال مکث نکن. گزینه‌ای را انتخاب کن که
                بیشتر شبیه خود واقعی توست.
              </p>
            </div>
          </div>

          <div className="gjv2-holland-intro__disclaimer">
            نتیجه این سنجش به‌تنهایی تعیین‌کننده انتخاب رشته نیست و
            در کنار نمرات، رتبه، شرایط فردی و سایر اطلاعات مسیر
            انتخاب رشته بررسی می‌شود.
          </div>

          <button
            type="button"
            className="gjv2-primary-button gjv2-holland-intro__start"
            onClick={() => setStarted(true)}
          >
            آماده‌ام؛ آزمون را شروع کنیم
            <span>←</span>
          </button>
        </section>
      ) : complete && !editingCompletedTest ? (
        <section className="gjv2-holland-complete">
          <div
            className="gjv2-holland-complete__icon"
            aria-hidden="true"
          >
            ✓
          </div>

          <span className="gjv2-holland-complete__eyebrow">
            سنجش تکمیل شده است
          </span>

          <h2>
            هر {toPersianDigits(ASSESSMENT_QUESTIONS.length)} پاسخ
            شما آماده تحلیل است
          </h2>

          <p>
            می‌توانی نتیجه سنجش را مشاهده کنی یا در صورت نیاز
            پاسخ‌هایت را دوباره مرور و ویرایش کنی.
          </p>

          {state.error ? (
            <p className="gpj-banner gpj-banner--error">
              {state.error}
            </p>
          ) : null}

          <form action={action}>
            {ASSESSMENT_QUESTIONS.map((item) => (
              <input
                key={item.id}
                type="hidden"
                name={`q_${item.id}`}
                value={answers[item.id] ?? ""}
              />
            ))}

            <button
              type="submit"
              disabled={pending}
              className="gjv2-primary-button gjv2-holland-complete__result"
            >
              {pending
                ? "در حال تحلیل..."
                : "مشاهده نتیجه رغبت‌سنجی"}
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
            onClick={() =>
              router.push(guidanceJourneyV2StepPath(3))
            }
          >
            بازگشت به مرحله قبل
          </button>
        </section>
      ) : question ? (
        <form action={action} className="gjv2-holland">
          {ASSESSMENT_QUESTIONS.map((item) => (
            <input
              key={item.id}
              type="hidden"
              name={`q_${item.id}`}
              value={answers[item.id] ?? ""}
            />
          ))}

          <div className="gjv2-holland__top">
            <div>
              <span>
                سؤال {toPersianDigits(index + 1)} از{" "}
                {toPersianDigits(
                  ASSESSMENT_QUESTIONS.length,
                )}
              </span>

              <strong>
                {toPersianDigits(answeredCount)} پاسخ ثبت شده
              </strong>
            </div>

            <span>
              {toPersianDigits(questionProgress)}٪
            </span>
          </div>

          <div className="gjv2-holland__progress">
            <span
              style={{
                width: `${questionProgress}%`,
              }}
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
              {resolveQuestionIcon(
                question.text,
                question.categoryId,
              )}
            </div>

            <p>{question.text}</p>

            <div className="gjv2-holland__options">
              {OPTIONS.map((option) => {
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
                    onClick={() =>
                      choose(option.value)
                    }
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
              {toPersianDigits(
                ASSESSMENT_QUESTIONS.length,
              )}
            </div>

            {index <
            ASSESSMENT_QUESTIONS.length - 1 ? (
              <button
                type="button"
                className="gjv2-primary-button"
                disabled={!currentAnswered}
                onClick={() =>
                  setIndex((current) =>
                    Math.min(
                      ASSESSMENT_QUESTIONS.length - 1,
                      current + 1,
                    ),
                  )
                }
              >
                سؤال بعدی
              </button>
            ) : complete ? (
              <button
                type="submit"
                disabled={pending}
                className="gjv2-primary-button"
              >
                {pending
                  ? "در حال تحلیل..."
                  : "ثبت پاسخ‌ها و مشاهده نتیجه"}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="gjv2-primary-button"
              >
                ابتدا به همه سؤال‌ها پاسخ بده
              </button>
            )}
          </div>
        </form>
      ) : null}
    </GuidanceJourneyV2Shell>
  );
}
