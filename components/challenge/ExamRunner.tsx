"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitChallengeExamAction } from "@/app/challenge/actions";
import { MathText } from "@/components/math/MathText";

type Question = {
  id: string;
  number: number;
  prompt: string;
  imageUrl: string | null;
  choices: Array<{ id: string; label: string; imageUrl: string | null }>;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="challenge-button challenge-button-primary challenge-button-full" type="submit" disabled={pending}>
      {pending ? "در حال ثبت پاسخ‌ها…" : "ثبت نهایی آزمون"}
    </button>
  );
}

function timeLabel(seconds: number): string {
  const minute = Math.floor(seconds / 60).toString().padStart(2, "0");
  const second = (seconds % 60).toString().padStart(2, "0");
  return `${minute}:${second}`;
}

export function ExamRunner(props: {
  attemptId: string;
  title: string;
  expiresAt: string;
  questions: Question[];
}) {
  const choiceLabels = ["الف", "ب", "ج", "د", "هـ", "و"];
  const formRef = useRef<HTMLFormElement>(null);
  const autoSubmitting = useRef(false);
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(props.expiresAt).getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      const value = Math.max(
        0,
        Math.floor((new Date(props.expiresAt).getTime() - Date.now()) / 1000),
      );
      setRemaining(value);
      if (value === 0 && !autoSubmitting.current) {
        autoSubmitting.current = true;
        formRef.current?.requestSubmit();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [props.expiresAt]);

  return (
    <form
      ref={formRef}
      action={submitChallengeExamAction}
      className="challenge-exam"
      onSubmit={(event) => {
        if (!autoSubmitting.current && !window.confirm("آزمون ثبت نهایی شود؟ پس از ثبت امکان ویرایش ندارید.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="attemptId" value={props.attemptId} />
      <div className="challenge-exam-sticky">
        <div>
          <small>آزمون فعال</small>
          <strong>{props.title}</strong>
        </div>
        <div className={remaining < 120 ? "challenge-timer challenge-timer-danger" : "challenge-timer"} dir="ltr">
          {timeLabel(remaining)}
        </div>
      </div>
      <div className="challenge-question-list">
        {props.questions.map((question) => (
          <fieldset key={question.id} className="challenge-question-card">
            <legend className="challenge-visually-hidden">
              سؤال {question.number}: {question.prompt || "سؤال تصویری"}
            </legend>
            {question.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="challenge-question-image challenge-question-image-first"
                src={question.imageUrl}
                alt={`صورت سؤال ${question.number}`}
              />
            ) : null}
            <div className="challenge-question-heading">
              <span>{question.number}</span>
              {question.prompt ? <MathText text={question.prompt} /> : <strong>گزینه درست را انتخاب کنید.</strong>}
            </div>
            <div className="challenge-choice-list">
              {question.choices.map((choice, index) => (
                <label key={choice.id} className="challenge-choice">
                  <input type="radio" name={`answer:${question.id}`} value={choice.id} />
                  <span className="challenge-choice-letter">{choiceLabels[index] ?? index + 1}</span>
                  <MathText text={choice.label} />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="challenge-exam-submit">
        <p>پاسخ‌های نزده بدون پاسخ محاسبه می‌شوند.</p>
        <SubmitButton />
      </div>
    </form>
  );
}
