"use client";

import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveOfficeInterestDraftAction,
  submitOfficeInterestAction,
  type OfficeInterestFormState,
} from "@/app/ms/interest/actions";
import { toPersianDigits } from "@/lib/persian";
import {
  ASSESSMENT_SECTIONS,
  ASSESSMENT_QUESTION_COUNT,
  firstIncompleteSectionIndex,
  getQuestionsForSection,
} from "@/lib/guidance/journey/assessment/question-bank";
import type { AssessmentAnswers } from "@/lib/guidance/journey/assessment/scoring";
import { MAJOR_OFFICE_HOME } from "@/lib/guidance/office/nav";
import { ChamberScene } from "@/components/guidance/office/ChamberScene";
import { CompassMark } from "@/components/guidance/office/illustrations";

const SCALE_LABELS = [
  "کاملاً مخالفم",
  "مخالفم",
  "نظری ندارم",
  "موافقم",
  "کاملاً موافقم",
] as const;

const initial: OfficeInterestFormState = {};

export function OfficeInterestExperience({
  initialAnswers,
  initialSectionId,
}: {
  initialAnswers: AssessmentAnswers;
  initialSectionId: string | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, action] = useActionState(submitOfficeInterestAction, initial);
  const [, startSave] = useTransition();
  const startIndex = useMemo(() => {
    if (Object.keys(initialAnswers).length === 0) return 0;
    const fromStore = ASSESSMENT_SECTIONS.findIndex((row) => row.id === initialSectionId);
    if (fromStore >= 0 && fromStore < ASSESSMENT_SECTIONS.length) return fromStore;
    return firstIncompleteSectionIndex(initialAnswers);
  }, [initialAnswers, initialSectionId]);

  const [phase, setPhase] = useState<"intro" | "taking" | "pause">(
    Object.keys(initialAnswers).length === 0 ? "intro" : "taking",
  );
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [answeredCount, setAnsweredCount] = useState(
    () =>
      Object.values(initialAnswers).filter((value) => value >= 1 && value <= 5).length,
  );

  const section = ASSESSMENT_SECTIONS[activeIndex]!;
  const questions = getQuestionsForSection(section.id);
  const isLast = activeIndex === ASSESSMENT_SECTIONS.length - 1;
  const overallPercent = Math.round((answeredCount / ASSESSMENT_QUESTION_COUNT) * 100);
  const doneSections = phase === "pause" ? activeIndex + 1 : activeIndex;
  const sectionPercent = Math.round(
    (Math.min(doneSections, ASSESSMENT_SECTIONS.length) / ASSESSMENT_SECTIONS.length) * 100,
  );

  function readAnswers(): AssessmentAnswers {
    if (!formRef.current) return { ...initialAnswers };
    const data = new FormData(formRef.current);
    const answers: AssessmentAnswers = { ...initialAnswers };
    for (const [key, value] of data.entries()) {
      if (!key.startsWith("q_")) continue;
      const parsed = Number(value);
      if (Number.isFinite(parsed)) answers[key.slice(2)] = parsed;
    }
    return answers;
  }

  function persist(sectionId: string) {
    const answers = readAnswers();
    setAnsweredCount(
      Object.values(answers).filter((value) => value >= 1 && value <= 5).length,
    );
    startSave(() => {
      void saveOfficeInterestDraftAction(JSON.stringify(answers), sectionId);
    });
  }

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(section.id), 700);
  }

  function goNext() {
    const answers = readAnswers();
    const unanswered = questions.filter((q) => {
      const value = answers[q.id];
      return typeof value !== "number";
    });
    if (unanswered.length > 0) {
      setSectionError("لطفاً به هر شش سؤال این بخش پاسخ بدهید.");
      return;
    }
    setSectionError(null);
    persist(section.id);
    setPhase("pause");
  }

  function continueAfterPause() {
    if (isLast) {
      formRef.current?.requestSubmit();
      return;
    }
    setActiveIndex((i) => i + 1);
    setPhase("taking");
  }

  function goBack() {
    setSectionError(null);
    setPhase("taking");
    setActiveIndex((i) => Math.max(0, i - 1));
  }

  function leave() {
    persist(section.id);
    router.push(MAJOR_OFFICE_HOME);
  }

  return (
    <div className="office-assess">
      {phase === "intro" ? (
        <>
          <header className="chamber-hero">
            <div>
              <p className="chamber-kicker">نگاه اول</p>
              <h1 className="chamber-title">اولین نگاه به شخصیت تحصیلی شما</h1>
              <p className="chamber-lead">
                ده اتاق کوتاه، هر کدام شش پرسش. این برچسب روان‌شناختی نیست —
                روشن کردن ترجیح‌هاست تا گفتگو با مهندس از حدس خالی شروع نشود.
                هر بخش ذخیره می‌شود؛ می‌توانید بروید و آرام برگردید.
              </p>
            </div>
            <ChamberScene caption="نقشه شخصیت">
              <CompassMark />
            </ChamberScene>
          </header>
          <ul className="chamber-promises">
            <li>
              حدود {toPersianDigits(ASSESSMENT_QUESTION_COUNT)} سؤال · مقیاس کاملاً
              مخالف تا کاملاً موافق
            </li>
            <li>۱۵ بُعد ترجیح، با نمره‌گذاری قابل توضیح</li>
            <li>نتیجه جای مشورت مهندس رضا ابراهیمی را نمی‌گیرد</li>
          </ul>
          <button
            type="button"
            className="chamber-go"
            onClick={() => setPhase("taking")}
          >
            آغاز نگاه اول
          </button>
        </>
      ) : null}

      {phase === "pause" ? (
        <>
          <header className="office-assess__hero">
            <p>پیشرفت شما ذخیره شد</p>
            <h1>
              بخش {toPersianDigits(activeIndex + 1)} از{" "}
              {toPersianDigits(ASSESSMENT_SECTIONS.length)} کامل شد
            </h1>
            <p>{section.title} ثبت شد. می‌توانید ادامه دهید یا بعداً برگردید.</p>
          </header>
          <div className="office-assess__progress">
            <div className="office-assess__progress-row">
              <span>بخش‌ها</span>
              <strong>{toPersianDigits(sectionPercent)}٪</strong>
            </div>
            <div
              className="office-assess__bar"
              role="progressbar"
              aria-valuenow={sectionPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${Math.max(6, sectionPercent)}%` }} />
            </div>
            <p>
              {toPersianDigits(answeredCount)} از {toPersianDigits(ASSESSMENT_QUESTION_COUNT)}{" "}
              سؤال پاسخ داده شده
            </p>
          </div>
          <div className="office-assess__nav">
            <button type="button" className="chamber-go" onClick={leave}>
              ذخیره و بعداً ادامه می‌دهم
            </button>
            <button type="button" className="chamber-go" onClick={continueAfterPause}>
              {isLast ? "مشاهده نتیجه" : "بخش بعدی"}
            </button>
          </div>
        </>
      ) : null}

      {phase === "taking" ? (
        <header>
          <p className="chamber-kicker">
            بخش {toPersianDigits(activeIndex + 1)} از{" "}
            {toPersianDigits(ASSESSMENT_SECTIONS.length)}
          </p>
          <h1 className="chamber-title">{section.title}</h1>
          <p className="chamber-lead">{section.description}</p>
          <div className="office-assess__progress">
            <div className="office-assess__progress-row">
              <span>کل آزمون</span>
              <strong>{toPersianDigits(overallPercent)}٪</strong>
            </div>
            <div
              className="office-assess__bar"
              role="progressbar"
              aria-valuenow={overallPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${Math.max(4, overallPercent)}%` }} />
            </div>
          </div>
        </header>
      ) : null}

      {(state.error || sectionError) && phase === "taking" ? (
        <p className="office-assess__error" role="alert">
          {sectionError ?? state.error}
        </p>
      ) : null}

      <form
        ref={formRef}
        action={action}
        className="office-assess__form"
        onChange={scheduleSave}
        hidden={phase !== "taking"}
      >
        {ASSESSMENT_SECTIONS.map((row, index) => (
          <div key={row.id} hidden={index !== activeIndex}>
            {getQuestionsForSection(row.id).map((question, qIndex) => (
              <fieldset key={question.id} className="office-assess__q">
                <legend>
                  <span>{toPersianDigits(qIndex + 1)}</span>
                  {question.text}
                </legend>
                <div className="office-assess__scale">
                  {SCALE_LABELS.map((label, scaleIndex) => {
                    const value = scaleIndex + 1;
                    return (
                      <label key={value}>
                        <input
                          type="radio"
                          name={`q_${question.id}`}
                          value={value}
                          defaultChecked={initialAnswers[question.id] === value}
                        />
                        <strong>{toPersianDigits(value)}</strong>
                        <em>{label}</em>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        ))}

        <div className="office-assess__nav">
          <button type="button" className="chamber-go" onClick={leave}>
            ذخیره و بعداً ادامه می‌دهم
          </button>
          {activeIndex > 0 ? (
            <button type="button" className="chamber-go" onClick={goBack}>
              بخش قبلی
            </button>
          ) : null}
          <button type="button" className="chamber-go" onClick={goNext}>
            پایان این بخش
          </button>
        </div>
      </form>
    </div>
  );
}
