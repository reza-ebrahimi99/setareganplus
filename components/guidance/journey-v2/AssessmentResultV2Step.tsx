"use client";

import {
  useActionState,
  useEffect,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";

import {
  submitGuidanceV2Step5Action,
} from "@/app/portal/student/services/guidance/journey/steps/actions/step5";

import type {
  JourneyV2FormState,
} from "@/app/portal/student/services/guidance/journey/steps/actions/step1";

import { GuidanceJourneyV2Shell } from "@/components/guidance/journey-v2/GuidanceJourneyV2Shell";
import { GuidanceJourneyV2Nav } from "@/components/guidance/journey-v2/GuidanceJourneyV2Nav";

import type {
  AssessmentAnswers,
  AssessmentResult,
} from "@/lib/guidance/journey/assessment/scoring";

import {
  guidanceJourneyV2StepPath,
} from "@/lib/guidance/journey-v2/catalog";

import type {
  GuidanceJourneySidebarStep,
} from "@/lib/guidance/journey/types";

import { toPersianDigits } from "@/lib/persian";

const initialState: JourneyV2FormState = {};

const CATEGORY_META: Record<
  string,
  {
    title: string;
    icon: string;
    note: string;
  }
> = {
  interests: {
    title: "علایق و کنجکاوی",
    icon: "✦",
    note: "میزان تمایل شما به کشف موضوعات تازه و یادگیری حوزه‌های متنوع.",
  },
  personality: {
    title: "سبک تصمیم و تعامل",
    icon: "◈",
    note: "الگوی کلی شما در مواجهه با انتخاب‌ها و موقعیت‌های مختلف.",
  },
  work_style: {
    title: "سبک کار",
    icon: "✓",
    note: "شیوه‌ای که در انجام کارها برای شما طبیعی‌تر و راحت‌تر است.",
  },
  learning_style: {
    title: "سبک یادگیری",
    icon: "◌",
    note: "روش‌هایی که می‌توانند یادگیری را برای شما روان‌تر کنند.",
  },
  social: {
    title: "تعامل اجتماعی",
    icon: "◎",
    note: "میزان تمایل شما به حضور، همکاری و ارتباط با دیگران.",
  },
  leadership: {
    title: "رهبری و هدایت",
    icon: "◆",
    note: "تمایل به مسئولیت‌پذیری، هماهنگی و هدایت جمع.",
  },
  research: {
    title: "تحلیل و پژوهش",
    icon: "⌁",
    note: "علاقه به بررسی عمیق، داده، دلیل و حل مسئله.",
  },
  creativity: {
    title: "خلاقیت",
    icon: "✧",
    note: "تمایل به ایده‌پردازی، طراحی و یافتن راه‌های تازه.",
  },
  helping: {
    title: "کمک به دیگران",
    icon: "♡",
    note: "میزان رضایت شما از همراهی، آموزش و حمایت دیگران.",
  },
  technical: {
    title: "گرایش فنی",
    icon: "⚙",
    note: "علاقه به ابزار، فناوری، سیستم‌ها و حل مسائل فنی.",
  },
  business: {
    title: "کسب‌وکار و مدیریت",
    icon: "↗",
    note: "تمایل به مدیریت منابع، مذاکره و ساختن فرصت‌های جدید.",
  },
  environmental: {
    title: "ترجیح محیط",
    icon: "♧",
    note: "نوع محیطی که احتمالاً در آن احساس راحتی بیشتری می‌کنید.",
  },
  decision_making: {
    title: "تصمیم‌گیری",
    icon: "◇",
    note: "شیوه جمع‌آوری اطلاعات و رسیدن به انتخاب نهایی.",
  },
  stress_tolerance: {
    title: "تاب‌آوری فشار",
    icon: "△",
    note: "نحوه عملکرد شما در شرایط فشرده و موقعیت‌های پرتنش.",
  },
  future_goals: {
    title: "افق آینده",
    icon: "→",
    note: "میزان توجه شما به اهداف و برنامه‌های بلندمدت.",
  },
};

const MAJOR_ICONS: Record<string, string> = {
  ENGINEERING: "⚙",
  COMPUTER_SCIENCE: "⌘",
  MEDICINE_HEALTH: "✚",
  BASIC_SCIENCES: "⌬",
  HUMANITIES_LAW: "§",
  SOCIAL_SCIENCES_PSYCHOLOGY: "♡",
  BUSINESS_MANAGEMENT: "↗",
  ARTS_DESIGN: "✦",
  EDUCATION_TEACHING: "◉",
  AGRICULTURE_ENVIRONMENT: "♧",
};

function percent(value: number) {
  return `${toPersianDigits(Math.round(value))}٪`;
}

export function AssessmentResultV2Step({
  sidebarSteps,
  completionPercentage,
  result,
  answers: _answers,
}: {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  result: AssessmentResult;
  answers: AssessmentAnswers;
}) {
  const router = useRouter();

  const [state, action, pending] = useActionState(
    submitGuidanceV2Step5Action,
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      router.replace(guidanceJourneyV2StepPath(6));
    }
  }, [router, state.ok]);

  const sortedScores = useMemo(
    () =>
      [...result.categoryScores].sort(
        (a, b) =>
          b.normalizedScore - a.normalizedScore,
      ),
    [result.categoryScores],
  );

  const dominant = sortedScores.slice(0, 3);

  return (
    <GuidanceJourneyV2Shell
      stepId={5}
      stepCount={18}
      title="نتیجه رغبت‌سنجی اختصاصی"
      description="تصویری چندبعدی از علایق، سبک تصمیم‌گیری، ویژگی‌های برجسته و حوزه‌های تحصیلی هم‌راستا با پاسخ‌های شما."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
    >
      <div className="gjv2-holland-result">

        <section className="gjv2-holland-result__hero">
          <span className="gjv2-holland-result__eyebrow">
            پروفایل غالب شما
          </span>

          <div
            className="gjv2-holland-result__code"
            dir="rtl"
          >
            {dominant.map((item) => {
              const meta =
                CATEGORY_META[item.categoryId] ?? {
                  title: item.categoryId,
                  icon: "•",
                  note: "",
                };

              return (
                <span key={item.categoryId}>
                  <small>{meta.icon}</small>
                  {toPersianDigits(
                    Math.round(item.normalizedScore),
                  )}
                </span>
              );
            })}
          </div>

          <h2>{result.personality.title}</h2>

          <p>{result.personality.description}</p>
        </section>

        <section className="gjv2-holland-result__scores">
          <div className="gjv2-holland-result__section-heading">
            <div>
              <span>نمای کلی</span>
              <h3>نقشه ویژگی‌های شما</h3>
            </div>

            <span>پروفایل رغبت</span>
          </div>

          <div className="gjv2-holland-result__bars">
            {sortedScores.map((score) => {
              const meta =
                CATEGORY_META[score.categoryId] ?? {
                  title: score.categoryId,
                  icon: "•",
                  note: "",
                };

              return (
                <article
                  key={score.categoryId}
                  className="gjv2-holland-result__bar-row"
                >
                  <div className="gjv2-holland-result__bar-label">
                    <span>{meta.icon}</span>

                    <div>
                      <strong>{meta.title}</strong>
                      <small>
                        امتیاز این بُعد از پاسخ‌های آزمون
                      </small>
                    </div>
                  </div>

                  <div className="gjv2-holland-result__bar-track">
                    <span
                      style={{
                        width: `${score.normalizedScore}%`,
                      }}
                    />
                  </div>

                  <strong className="gjv2-holland-result__percent">
                    {percent(score.normalizedScore)}
                  </strong>
                </article>
              );
            })}
          </div>
        </section>

        <section className="gjv2-holland-result__dominant">
          <div className="gjv2-holland-result__section-heading">
            <div>
              <span>سه ویژگی برجسته</span>
              <h3>
                این نتیجه درباره شما چه می‌گوید؟
              </h3>
            </div>
          </div>

          <div className="gjv2-holland-result__dominant-grid">
            {dominant.map((score, index) => {
              const meta =
                CATEGORY_META[score.categoryId] ?? {
                  title: score.categoryId,
                  icon: "•",
                  note: "",
                };

              return (
                <article
                  key={score.categoryId}
                  className="gjv2-holland-result__profile"
                >
                  <div className="gjv2-holland-result__profile-top">
                    <span>{meta.icon}</span>

                    <small>
                      ویژگی برجسته{" "}
                      {toPersianDigits(index + 1)}
                    </small>
                  </div>

                  <h4>{meta.title}</h4>

                  <strong>
                    {percent(score.normalizedScore)}
                  </strong>

                  <p>{meta.note}</p>
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
            <span>
              سرنخ‌های اولیه برای بررسی بیشتر
            </span>

            <h3>
              حوزه‌های دانشگاهی همسو با الگوی شما
            </h3>

            <p>
              این پیشنهادها بر اساس الگوی پاسخ‌های همین سنجش
              هستند و نسخه قطعی انتخاب رشته محسوب نمی‌شوند.
              در ادامه، رتبه، نمرات، دانشگاه، شهر، بازار کار و
              شرایط فردی نیز وارد تصمیم می‌شوند.
            </p>

            <div className="gjv2-holland-result__chips">
              {result.suitableMajors.map((major) => (
                <span key={major.clusterId}>
                  {MAJOR_ICONS[major.clusterId] ?? "✦"}{" "}
                  {major.title}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="gjv2-holland-reco">
          <header className="gjv2-holland-reco__head">
            <p>
              پیشنهاد بر اساس نتیجه سنجش شما
            </p>

            <h3>
              حوزه‌های دانشگاهی با هم‌خوانی بیشتر
            </h3>

            <p>
              این بخش برای شروع بررسی رشته‌هاست؛ نه تصمیم
              نهایی. انتخاب رشته نهایی باید با اطلاعات آموزشی
              و شرایط واقعی شما ترکیب شود.
            </p>
          </header>

          <div className="gjv2-holland-reco__groups">
            <article className="gjv2-holland-reco__group gjv2-holland-reco__group--high">
              <h4>
                پیشنهادهای اصلی برای بررسی
              </h4>

              <ul>
                {result.suitableMajors.map((major) => (
                  <li key={major.clusterId}>
                    <strong>
                      <span
                        aria-hidden="true"
                        style={{
                          marginInlineEnd: ".45rem",
                        }}
                      >
                        {MAJOR_ICONS[
                          major.clusterId
                        ] ?? "✦"}
                      </span>

                      {major.title}
                    </strong>

                    <span>
                      میزان هم‌خوانی با الگوی پاسخ‌ها:{" "}
                      {percent(major.fitScore)}
                    </span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="gjv2-holland-reco__group gjv2-holland-reco__group--lower">
              <h4>
                حوزه‌هایی که نیاز به بررسی دقیق‌تر دارند
              </h4>

              <ul>
                {result.lessSuitableMajors.map(
                  (major) => (
                    <li key={major.clusterId}>
                      <strong>
                        {MAJOR_ICONS[
                          major.clusterId
                        ] ?? "◇"}{" "}
                        {major.title}
                      </strong>

                      <span>
                        {major.cautionNote}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </article>
          </div>
        </section>

        <section className="gjv2-holland-result__advisor-note">
          <div>
            <span>💡</span>
          </div>

          <div>
            <strong>
              نتیجه رغبت‌سنجی، تصمیم نهایی انتخاب رشته نیست
            </strong>

            <p>
              این نتیجه یکی از ورودی‌های تصمیم‌گیری است.
              رتبه، سهمیه، نمرات نهایی، توانمندی درسی،
              دانشگاه، شهر، بازار کار، شرایط خانوادگی و
              اولویت‌های شخصی نیز در مراحل بعدی بررسی
              می‌شوند.
            </p>
          </div>
        </section>

        {state.error ? (
          <div
            className="gjv2-banner gjv2-banner--error"
            role="alert"
          >
            {state.error}
          </div>
        ) : null}

        <form action={action}>
          <GuidanceJourneyV2Nav
            previous={{
              label: "بازگشت به آزمون",
              onClick: () =>
                router.push(
                  guidanceJourneyV2StepPath(4),
                ),
            }}
            next={{
              label:
                "ادامه به اولویت دوره‌های تحصیلی",
              pending,
              pendingLabel: "در حال ثبت...",
            }}
          />
        </form>
      </div>
    </GuidanceJourneyV2Shell>
  );
}
