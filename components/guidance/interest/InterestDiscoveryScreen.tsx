"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  completeInterestAssessmentAction,
  navigateInterestAssessmentAction,
  saveInterestAnswerAction,
  startInterestAssessmentAction,
} from "@/app/portal/student/services/guidance/interest-actions";
import { PortalIcon } from "@/components/portal/icons";
import { InterestProgressRing } from "@/components/guidance/interest/InterestProgressRing";
import { toPersianDigits } from "@/lib/persian";
import type {
  InterestAnswerValue,
  InterestAssessmentPresentationModel,
  InterestOption,
  InterestQuestion,
} from "@/lib/guidance/interest/types";

type InterestDiscoveryScreenProps = {
  model: InterestAssessmentPresentationModel;
};

function optionSelected(
  answer: InterestAnswerValue | null,
  optionId: string,
): boolean {
  if (!answer) return false;
  if (answer.kind === "single" || answer.kind === "card" || answer.kind === "image") {
    return answer.optionId === optionId;
  }
  if (answer.kind === "multiple") return answer.optionIds.includes(optionId);
  if (answer.kind === "priority" || answer.kind === "drag_drop") {
    return answer.orderedOptionIds.includes(optionId);
  }
  return false;
}

function AnswerArea({
  question,
  value,
  onChange,
}: {
  question: InterestQuestion;
  value: InterestAnswerValue | null;
  onChange: (next: InterestAnswerValue) => void;
}) {
  if (question.type === "scale") {
    const min = question.scaleMin ?? 1;
    const max = question.scaleMax ?? 5;
    const current = value?.kind === "scale" ? value.value : null;
    const scores = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
      <div className="interest-scale" role="group" aria-label={question.title}>
        <div className="interest-scale__labels">
          <span>{question.scaleMinLabel}</span>
          <span>{question.scaleMaxLabel}</span>
        </div>
        <div className="interest-scale__options">
          {scores.map((score) => (
            <button
              key={score}
              type="button"
              className={`interest-scale__btn${current === score ? " is-active" : ""}`}
              aria-pressed={current === score}
              onClick={() => onChange({ kind: "scale", value: score })}
            >
              {toPersianDigits(score)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (question.type === "multiple_choice") {
    const selected =
      value?.kind === "multiple" ? value.optionIds : ([] as string[]);
    const max = question.maxSelections ?? question.options.length;

    function toggle(optionId: string) {
      const set = new Set(selected);
      if (set.has(optionId)) set.delete(optionId);
      else if (set.size < max) set.add(optionId);
      onChange({ kind: "multiple", optionIds: [...set] });
    }

    return (
      <div className="interest-options interest-options--multi" role="group">
        {question.options.map((opt) => (
          <OptionButton
            key={opt.id}
            option={opt}
            selected={selected.includes(opt.id)}
            onSelect={() => toggle(opt.id)}
          />
        ))}
      </div>
    );
  }

  if (question.type === "priority_ranking" || question.type === "drag_drop") {
    const ordered =
      value?.kind === "priority" || value?.kind === "drag_drop"
        ? value.orderedOptionIds
        : [];
    const max = question.maxSelections ?? question.options.length;

    function toggle(optionId: string) {
      if (ordered.includes(optionId)) {
        const next = ordered.filter((id) => id !== optionId);
        onChange(
          question.type === "drag_drop"
            ? { kind: "drag_drop", orderedOptionIds: next }
            : { kind: "priority", orderedOptionIds: next },
        );
        return;
      }
      if (ordered.length >= max) return;
      const next = [...ordered, optionId];
      onChange(
        question.type === "drag_drop"
          ? { kind: "drag_drop", orderedOptionIds: next }
          : { kind: "priority", orderedOptionIds: next },
      );
    }

    return (
      <div className="interest-priority">
        <p className="interest-priority__hint">
          به ترتیب اهمیت انتخاب کن
          {question.supportsDragDrop
            ? " (جایگاه کشیدن و رها کردن برای آینده آماده است)"
            : ""}
          .
        </p>
        <ol className="interest-priority__order" aria-label="ترتیب انتخاب">
          {ordered.map((id, index) => {
            const opt = question.options.find((o) => o.id === id);
            return (
              <li key={id}>
                <span>{toPersianDigits(index + 1)}</span>
                {opt?.label ?? id}
              </li>
            );
          })}
        </ol>
        <div className="interest-options" role="group">
          {question.options.map((opt) => (
            <OptionButton
              key={opt.id}
              option={opt}
              selected={ordered.includes(opt.id)}
              badge={
                ordered.includes(opt.id)
                  ? toPersianDigits(ordered.indexOf(opt.id) + 1)
                  : null
              }
              onSelect={() => toggle(opt.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  // single / card / image_selection
  const kind =
    question.type === "card_selection"
      ? "card"
      : question.type === "image_selection"
        ? "image"
        : "single";

  return (
    <div
      className={`interest-options${question.type === "card_selection" || question.type === "image_selection" ? " interest-options--cards" : ""}`}
      role="radiogroup"
      aria-label={question.title}
    >
      {question.options.map((opt) => (
        <OptionButton
          key={opt.id}
          option={opt}
          selected={optionSelected(value, opt.id)}
          imageSlot={question.type === "image_selection"}
          onSelect={() =>
            onChange(
              kind === "card"
                ? { kind: "card", optionId: opt.id }
                : kind === "image"
                  ? { kind: "image", optionId: opt.id }
                  : { kind: "single", optionId: opt.id },
            )
          }
        />
      ))}
    </div>
  );
}

function OptionButton({
  option,
  selected,
  onSelect,
  badge,
  imageSlot,
}: {
  option: InterestOption;
  selected: boolean;
  onSelect: () => void;
  badge?: string | null;
  imageSlot?: boolean;
}) {
  return (
    <button
      type="button"
      className={`interest-option${selected ? " is-selected" : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      {imageSlot ? (
        <span className="interest-option__art" aria-hidden="true">
          <PortalIcon name="layers" className="size-6" />
        </span>
      ) : null}
      <span className="interest-option__label">{option.label}</span>
      {option.description ? (
        <span className="interest-option__desc">{option.description}</span>
      ) : null}
      {badge ? <span className="interest-option__badge">{badge}</span> : null}
    </button>
  );
}

/**
 * Interest Discovery journey — client only for answers / transitions.
 */
export function InterestDiscoveryScreen({ model }: InterestDiscoveryScreenProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localAnswer, setLocalAnswer] = useState<InterestAnswerValue | null>(
    model.currentQuestion?.answer ?? null,
  );
  const [saving, setSaving] = useState(false);

  const question = model.currentQuestion?.question ?? null;

  useEffect(() => {
    setLocalAnswer(model.currentQuestion?.answer ?? null);
  }, [model.currentQuestion?.question.id, model.phase]);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "خطا در ذخیره");
        return;
      }
      router.refresh();
    });
  }

  async function persistAnswer(
    answer: InterestAnswerValue,
    advance: boolean,
  ) {
    if (!question) return;
    setSaving(true);
    setError(null);
    const result = await saveInterestAnswerAction({
      questionId: question.id,
      answer,
      advance,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (advance) router.refresh();
  }

  return (
    <div
      className="interest-discovery"
      data-phase={model.phase}
      data-portal-accent="purple"
    >
      <header className="interest-hero">
        <div className="interest-hero__glow" aria-hidden="true" />
        <div className="interest-hero__layout">
          <div className="interest-hero__copy">
            <p className="interest-hero__eyebrow">{model.hero.eyebrow}</p>
            <p className="interest-hero__chip">{model.hero.statusLabel}</p>
            <h1 className="interest-hero__headline">{model.hero.headline}</h1>
            <p className="interest-hero__support">{model.hero.support}</p>
          </div>
          <InterestProgressRing
            percent={model.progress.ringPercent}
            label="پیشرفت کلی"
          />
        </div>
        <div className="interest-hero__meta" aria-live="polite">
          <span>
            باقیمانده: {toPersianDigits(model.progress.remainingQuestions)} سؤال
          </span>
          <span>{model.progress.estimatedRemainingLabel}</span>
        </div>
      </header>

      <nav className="interest-sections" aria-label="بخش‌های آزمون">
        {model.sections.map((section) => (
          <div
            key={section.id}
            className="interest-section-chip"
            data-state={section.state}
            data-portal-accent={section.accent}
          >
            <PortalIcon name={section.icon} className="size-4" />
            <span>{section.title}</span>
            <strong>{toPersianDigits(section.percent)}٪</strong>
          </div>
        ))}
      </nav>

      {error ? (
        <p className="interest-error" role="alert">
          {error}
        </p>
      ) : null}

      {model.phase === "introduction" ? (
        <section className="interest-panel">
          <h2 className="interest-panel__title">سفر کشف رغبت</h2>
          <p className="interest-panel__body">
            چند بخش کوتاه درباره علایق شغلی، سبک یادگیری، شخصیت و ترجیحات کاری.
            هر پاسخ همان لحظه ذخیره می‌شود — می‌توانی بعداً ادامه بدهی.
          </p>
          <ul className="interest-panel__list">
            <li>بدون عجله و بدون صفحه شلوغ</li>
            <li>ذخیره خودکار پیش‌نویس</li>
            <li>نتایج معماری‌شده — بدون هوش مصنوعی جعلی</li>
          </ul>
          <button
            type="button"
            className="interest-btn interest-btn--primary"
            disabled={pending}
            onClick={() => run(startInterestAssessmentAction)}
          >
            شروع آزمون
          </button>
          <a href={model.returnHref} className="interest-btn interest-btn--ghost">
            بازگشت به مسیر
          </a>
        </section>
      ) : null}

      {model.phase === "questions" && model.currentQuestion && question ? (
        <section
          className="interest-question-card"
          aria-labelledby="interest-q-title"
        >
          <div className="interest-question-card__progress">
            سؤال {toPersianDigits(model.currentQuestion.indexInAssessment)} از{" "}
            {toPersianDigits(model.currentQuestion.totalQuestions)} ·{" "}
            {model.currentQuestion.sectionTitle}
          </div>
          <h2 id="interest-q-title" className="interest-question-card__title">
            {question.title}
          </h2>
          <p className="interest-question-card__desc">{question.description}</p>
          {question.illustrationSlot ? (
            <div
              className="interest-question-card__art"
              aria-hidden="true"
              data-slot={question.illustrationSlot}
            >
              <PortalIcon name="spark" className="size-8" />
            </div>
          ) : null}

          <AnswerArea
            question={question}
            value={localAnswer}
            onChange={(next) => {
              setLocalAnswer(next);
              void persistAnswer(next, false);
            }}
          />

          <div className="interest-question-card__nav">
            <button
              type="button"
              className="interest-btn interest-btn--ghost"
              disabled={pending || saving || !model.currentQuestion.canGoPrevious}
              onClick={() =>
                run(() =>
                  navigateInterestAssessmentAction({ direction: "previous" }),
                )
              }
            >
              قبلی
            </button>
            <button
              type="button"
              className="interest-btn interest-btn--primary"
              disabled={pending || saving || !localAnswer}
              onClick={() => {
                if (!localAnswer) return;
                void persistAnswer(localAnswer, true);
              }}
            >
              {model.currentQuestion.isLastQuestion ? "رفتن به بازبینی" : "بعدی"}
            </button>
          </div>
          <p className="interest-autosave" aria-live="polite">
            {saving || pending ? "در حال ذخیره..." : "پاسخ‌ها خودکار ذخیره می‌شوند"}
          </p>
        </section>
      ) : null}

      {model.phase === "review" ? (
        <section className="interest-panel">
          <h2 className="interest-panel__title">بازبینی پاسخ‌ها</h2>
          <ul className="interest-review">
            {model.reviewItems.map((item) => (
              <li key={item.questionId}>
                <button
                  type="button"
                  className="interest-review__item"
                  onClick={() => {
                    const target = model.questions.find(
                      (question) => question.id === item.questionId,
                    );
                    if (!target) return;
                    run(() =>
                      navigateInterestAssessmentAction({
                        direction: "section",
                        sectionId: target.sectionId,
                        questionId: item.questionId,
                      }),
                    );
                  }}
                >
                  <span className="interest-review__section">
                    {item.sectionTitle}
                  </span>
                  <strong>{item.title}</strong>
                  <span>{item.answerLabel}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="interest-btn interest-btn--primary"
            disabled={pending}
            onClick={() => run(completeInterestAssessmentAction)}
          >
            ثبت نهایی آزمون
          </button>
        </section>
      ) : null}

      {model.phase === "completed" ? (
        <section className="interest-complete">
          <div className="interest-confetti" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <span className="interest-complete__icon" aria-hidden="true">
            <PortalIcon name="medal" className="size-8" />
          </span>
          <h2 className="interest-complete__title">آفرین — ثبت شد</h2>
          <p className="interest-complete__body">
            حالا به مسیر انتخاب رشته برگرد. پروفایل رغبت در معماری نتایج آماده
            است — بدون داده ساختگی.
          </p>
          <InterestProfileArchitecture model={model} />
          <a href={model.returnHref} className="interest-btn interest-btn--primary">
            بازگشت به مسیر انتخاب رشته
          </a>
        </section>
      ) : null}
    </div>
  );
}

function InterestProfileArchitecture({
  model,
}: {
  model: InterestAssessmentPresentationModel;
}) {
  const bands = [
    model.profile.strongInterests,
    model.profile.moderateInterests,
    model.profile.weakInterests,
    model.profile.learningStyle,
    model.profile.workEnvironment,
    model.profile.communicationStyle,
    model.profile.futureAiPlaceholder,
  ];

  return (
    <div className="interest-profile">
      <p className="interest-profile__note">معماری پروفایل رغبت</p>
      <div className="interest-profile__grid">
        {bands.map((band) => (
          <article key={band.id} className="interest-profile__card">
            <h3>{band.title}</h3>
            <p>{band.description}</p>
            {band.items.length === 0 ? (
              <div className="interest-profile__empty">
                <strong>{band.emptyTitle}</strong>
                <span>{band.emptyDescription}</span>
              </div>
            ) : (
              <ul>
                {band.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
      <ul className="interest-frameworks" aria-label="چارچوب‌های آینده">
        {model.futureFrameworks.map((fw) => (
          <li key={fw}>{fw}</li>
        ))}
      </ul>
    </div>
  );
}
