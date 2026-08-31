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
import { ConstellationMark } from "@/components/guidance/office/illustrations";

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
    <div>
      {phase === "intro" ? (
        <>
          <header className="chamber-hero">
            <div>
              <p className="chamber-kicker">صورت‌فلکی</p>
              <h1 className="chamber-title">اولین نگاه به شخصیت تحصیلی شما</h1>
              <p className="chamber-lead">
                ده اتاق کوتاه، هر کدام شش پرسش. این برچسب روان‌شناختی نیست —
                روشن کردن ترجیح‌هاست تا گفتگو با مهندس از حدس خالی شروع نشود.
                هر بخش ذخیره می‌شود؛ می‌توانید بروید و آرام برگردید.
              </p>
            </div>
            <ChamberScene caption="کشف">
              <ConstellationMark />
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
            آغاز کشف
          </button>
        </>
      ) : null}

      {phase === "pause" ? (
        <>
          <header className="chamber-hero">
            <div>
              <p className="chamber-kicker">ثبت شد</p>
              <h1 className="chamber-title">{section.title}</h1>
              <p className="chamber-lead">
                بخش {toPersianDigits(activeIndex + 1)} از{" "}
                {toPersianDigits(ASSESSMENT_SECTIONS.length)} روی کاغذ نشست.
                {toPersianDigits(answeredCount)} از{" "}
                {toPersianDigits(ASSESSMENT_QUESTION_COUNT)} ستاره روشن است.
              </p>
            </div>
            <ChamberScene caption="ادامه صورت‌فلکی">
              <ConstellationMark />
            </ChamberScene>
          </header>
          <div className="chamber-actions">
            <button type="button" className="chamber-go" onClick={continueAfterPause}>
              {isLast ? "مشاهده نتیجه" : "اتاق بعدی"}
            </button>
            <button type="button" className="chamber-quiet" onClick={leave}>
              ذخیره و بعداً ادامه
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
        </header>
      ) : null}

      {(state.error || sectionError) && phase === "taking" ? (
        <p className="chamber-alert" role="alert">
          {sectionError ?? state.error}
        </p>
      ) : null}

      <form
        ref={formRef}
        action={action}
        className="chamber-sheet"
        onChange={scheduleSave}
        hidden={phase !== "taking"}
      >
        {ASSESSMENT_SECTIONS.map((row, index) => (
          <div key={row.id} hidden={index !== activeIndex}>
            {getQuestionsForSection(row.id).map((question, qIndex) => (
              <fieldset key={question.id} className="chamber-q">
                <legend>
                  <span>{toPersianDigits(qIndex + 1)}</span>
                  {question.text}
                </legend>
                <div className="chamber-scale">
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
                        <i aria-hidden="true" />
                        <em>{label}</em>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        ))}

        <div className="chamber-actions">
          <button type="button" className="chamber-go" onClick={goNext}>
            پایان این بخش
          </button>
          {activeIndex > 0 ? (
            <button type="button" className="chamber-quiet" onClick={goBack}>
              بخش قبلی
            </button>
          ) : null}
          <button type="button" className="chamber-quiet" onClick={leave}>
            ذخیره و بعداً ادامه
          </button>
        </div>
      </form>
    </div>
  );
}
