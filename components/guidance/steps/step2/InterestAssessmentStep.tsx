"use client";

/**
 * Guidance Journey Engine — Step 2: Interest Assessment.
 * ~50 Likert questions grouped into 11 sections, all mounted in one <form>
 * (sections are shown/hidden via CSS, never unmounted, so native radio state
 * persists across "Next/Back" navigation with zero controlled-input wiring).
 * Results render immediately after a successful submit.
 */

import { useActionState, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveGuidanceStep2DraftAction,
  submitGuidanceStep2Action,
  type GuidanceStep2FormState,
} from "@/app/portal/student/services/guidance/steps/actions/step2";
import { GuidanceStepShell } from "@/components/guidance/steps/GuidanceStepShell";
import type { GuidanceStepEmbedProps } from "@/components/guidance/steps/embed";
import { GuidanceInterestResultsView } from "@/components/guidance/steps/step2/GuidanceInterestResultsView";
import { guidanceJourneyStepPath } from "@/lib/guidance/journey/steps";
import { ASSESSMENT_CATEGORIES } from "@/lib/guidance/journey/assessment/categories";
import { getQuestionsForCategory } from "@/lib/guidance/journey/assessment/question-bank";
import { toPersianDigits } from "@/lib/persian";
import type {
  AssessmentAnswers,
  AssessmentResult,
} from "@/lib/guidance/journey/assessment/scoring";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

const SCALE_LABELS = ["کاملاً مخالفم", "مخالفم", "نظری ندارم", "موافقم", "کاملاً موافقم"];

type InterestAssessmentStepProps = {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  initialAnswers: AssessmentAnswers;
} & GuidanceStepEmbedProps;

const initial: GuidanceStep2FormState = {};

export function InterestAssessmentStep({
  sidebarSteps,
  completionPercentage,
  initialAnswers,
  embed = false,
  stayOnSuccess = false,
  formAction,
  hiddenFields,
}: InterestAssessmentStepProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(formAction ?? submitGuidanceStep2Action, initial);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  const sections = useMemo(
    () =>
      ASSESSMENT_CATEGORIES.map((category) => ({
        category,
        questions: getQuestionsForCategory(category.id),
      })),
    [],
  );

  const activeSection = sections[activeIndex]!;
  const isLast = activeIndex === sections.length - 1;

  function currentAnswers(): AssessmentAnswers {
    if (!formRef.current) return {};
    const data = new FormData(formRef.current);
    const answers: AssessmentAnswers = {};
    for (const [key, value] of data.entries()) {
      if (!key.startsWith("q_")) continue;
      const parsed = Number(value);
      if (Number.isFinite(parsed)) answers[key.slice(2)] = parsed;
    }
    return answers;
  }

  function goNext() {
    const answers = currentAnswers();
    const unanswered = activeSection.questions.filter((q) => !(q.id in answers));
    if (unanswered.length > 0) {
      setSectionError("لطفاً به همه سؤالات این بخش پاسخ بده.");
      return;
    }
    setSectionError(null);
    if (!embed) void saveGuidanceStep2DraftAction(JSON.stringify(answers));
    setActiveIndex((i) => Math.min(sections.length - 1, i + 1));
  }

  function goBack() {
    setSectionError(null);
    setActiveIndex((i) => Math.max(0, i - 1));
  }

  async function handleSaveDraft() {
    setSavingDraft(true);
    if (!embed) await saveGuidanceStep2DraftAction(JSON.stringify(currentAnswers()));
    setSavingDraft(false);
  }

  const result: AssessmentResult | undefined =
    state.ok &&
    "result" in state &&
    state.result &&
    typeof state.result === "object" &&
    "personality" in (state.result as object)
      ? (state.result as AssessmentResult)
      : undefined;

  if (state.ok && result) {
    return (
      <GuidanceStepShell
        stepId={2}
        stepCount={12}
        title="نتیجه سنجش رغبت شما"
        description="پروفایل شخصیتی و رشته‌های پیشنهادی بر اساس پاسخ‌هایت محاسبه شد."
        sidebarSteps={sidebarSteps}
        completionPercentage={completionPercentage}
        celebrate
        embed={embed}
      >
        <GuidanceInterestResultsView result={result} />
        {stayOnSuccess ? null : (
          <div className="gpj-actions" style={{ position: "static", marginTop: "1rem" }}>
            <span />
            <button
              type="button"
              className="gpj-actions__continue"
              onClick={() => router.push(guidanceJourneyStepPath(3))}
            >
              ادامه به ثبت‌نام و پرداخت
            </button>
          </div>
        )}
      </GuidanceStepShell>
    );
  }

  return (
    <GuidanceStepShell
      stepId={2}
      stepCount={12}
      title="آزمون سنجش رغبت"
      description="۱۱ بخش کوتاه، حدود ۵۰ سؤال. صادقانه و بر اساس اولین برداشتت پاسخ بده."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
      embed={embed}
    >
      <div className="gpj-card" style={{ marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p className="gpj-card__title" style={{ marginBottom: 0 }}>
            بخش {toPersianDigits(activeIndex + 1)} از {toPersianDigits(sections.length)} ·{" "}
            {activeSection.category.title}
          </p>
        </div>
        <p className="gpj-card__desc" style={{ marginTop: "0.375rem", marginBottom: 0 }}>
          {activeSection.category.description}
        </p>
        <div className="gpj-shell__mobile-progress-track" style={{ marginTop: "0.75rem" }}>
          <div
            className="gpj-shell__mobile-progress-fill"
            style={{ width: `${((activeIndex + 1) / sections.length) * 100}%` }}
          />
        </div>
      </div>

      {(state.error || sectionError) && (
        <p className="gpj-banner gpj-banner--error" role="alert">
          {sectionError ?? state.error}
        </p>
      )}

      <form ref={formRef} action={action} className="gpj-card">
        {hiddenFields
          ? Object.entries(hiddenFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))
          : null}
        {embed ? (
          <div className="gpj-field" style={{ marginBottom: "1rem" }}>
            <label className="gpj-field__label" htmlFor="editReason">
              دلیل ویرایش مشاور
            </label>
            <input id="editReason" name="editReason" type="text" required className="gpj-input" />
          </div>
        ) : null}
        {sections.map((section, index) => (
          <div
            key={section.category.id}
            style={{ display: index === activeIndex ? "block" : "none" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {section.questions.map((question) => (
                <fieldset key={question.id} className="gpj-assess-question">
                  <legend className="gpj-assess-question__text">{question.text}</legend>
                  <div className="gpj-assess-question__scale">
                    {SCALE_LABELS.map((label, scaleIndex) => {
                      const value = scaleIndex + 1;
                      return (
                        <label key={value} className="gpj-assess-question__option">
                          <input
                            type="radio"
                            name={`q_${question.id}`}
                            value={value}
                            defaultChecked={initialAnswers[question.id] === value}
                          />
                          <span>{toPersianDigits(value)}</span>
                          <em>{label}</em>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          </div>
        ))}

        <div className="gpj-actions">
          <button
            type="button"
            className="gpj-actions__draft"
            onClick={handleSaveDraft}
            disabled={savingDraft}
          >
            {savingDraft ? "در حال ذخیره…" : "ذخیره پیش‌نویس"}
          </button>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {activeIndex > 0 && (
              <button type="button" className="gpj-actions__draft" onClick={goBack}>
                بخش قبلی
              </button>
            )}
            {isLast ? (
              <button type="submit" className="gpj-actions__continue">
                ثبت و مشاهده نتیجه
              </button>
            ) : (
              <button type="button" className="gpj-actions__continue" onClick={goNext}>
                بخش بعدی
              </button>
            )}
          </div>
        </div>
      </form>
    </GuidanceStepShell>
  );
}
