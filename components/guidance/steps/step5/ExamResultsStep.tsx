"use client";

/**
 * Guidance Journey Engine — Step 5: Exam Results.
 */

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitGuidanceStep5Action } from "@/app/portal/student/services/guidance/steps/actions/step5";
import { GuidanceStepActions } from "@/components/guidance/steps/GuidanceStepActions";
import { GuidanceStepShell } from "@/components/guidance/steps/GuidanceStepShell";
import { guidanceJourneyStepPath } from "@/lib/guidance/journey/steps";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";
import type { GuidanceStepFormState } from "@/lib/guidance/journey/types";

type ExamResultsStepProps = {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  hasDocument: boolean;
  existingFileName: string | null;
  prefill: {
    nationalRank: string;
    regionalRank: string;
    quotaRank: string;
    score: string;
  };
};

const initial: GuidanceStepFormState = {};

export function ExamResultsStep({
  sidebarSteps,
  completionPercentage,
  hasDocument,
  existingFileName,
  prefill,
}: ExamResultsStepProps) {
  const router = useRouter();
  const [state, action] = useActionState(submitGuidanceStep5Action, initial);
  const celebrating = Boolean(state.ok);
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.ok) return;
    const timer = setTimeout(() => router.push(guidanceJourneyStepPath(6)), 1400);
    return () => clearTimeout(timer);
  }, [state.ok, router]);

  const fieldErrors = state.fieldErrors ?? {};

  function validate(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const required = ["nationalRank", "regionalRank", "score"] as const;
    for (const name of required) {
      const el = form.elements.namedItem(name);
      const value = el && "value" in el && typeof el.value === "string" ? el.value.trim() : "";
      if (!value) {
        event.preventDefault();
        setClientError("لطفاً همه فیلدهای الزامی را تکمیل کنید.");
        return;
      }
    }
    const ack = form.elements.namedItem("acknowledged");
    if (ack instanceof HTMLInputElement && !ack.checked) {
      event.preventDefault();
      setClientError("لطفاً مسئولیت صحت اطلاعات را بپذیر.");
      return;
    }
    if (!hasDocument) {
      const file = form.elements.namedItem("file");
      if (file instanceof HTMLInputElement && file.files?.length === 0) {
        event.preventDefault();
        setClientError("بارگذاری کارنامه رسمی سنجش الزامی است.");
        return;
      }
    }
    setClientError(null);
  }

  return (
    <GuidanceStepShell
      stepId={5}
      stepCount={12}
      title="نتایج آزمون سنجش"
      description="رتبه و نمره خودت را ثبت کن و کارنامه رسمی را بارگذاری کن."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
      celebrate={celebrating}
    >
      <form action={action} onSubmit={validate} encType="multipart/form-data" className="gpj-card">
        <h2 className="gpj-card__title">اطلاعات نتیجه آزمون</h2>
        <p className="gpj-banner gpj-banner--warning" style={{ marginBottom: "1rem" }}>
          مسئولیت صحت این اطلاعات با شماست. مشاور می‌تواند بعداً فایل بارگذاری‌شده را
          با اعداد ثبت‌شده مقایسه کند.
        </p>

        {(clientError || state.error) && (
          <p className="gpj-banner gpj-banner--error" role="alert" style={{ marginBottom: "1rem" }}>
            {clientError ?? state.error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="gpj-field">
            <label className="gpj-field__label" htmlFor="nationalRank">
              رتبه کشوری
            </label>
            <input
              id="nationalRank"
              name="nationalRank"
              type="text"
              inputMode="numeric"
              defaultValue={prefill.nationalRank}
              className="gpj-input"
              aria-invalid={Boolean(fieldErrors.nationalRank)}
            />
            {fieldErrors.nationalRank && <p className="gpj-field__error">{fieldErrors.nationalRank}</p>}
          </div>

          <div className="gpj-field">
            <label className="gpj-field__label" htmlFor="regionalRank">
              رتبه منطقه
            </label>
            <input
              id="regionalRank"
              name="regionalRank"
              type="text"
              inputMode="numeric"
              defaultValue={prefill.regionalRank}
              className="gpj-input"
              aria-invalid={Boolean(fieldErrors.regionalRank)}
            />
            {fieldErrors.regionalRank && <p className="gpj-field__error">{fieldErrors.regionalRank}</p>}
          </div>

          <div className="gpj-field">
            <label className="gpj-field__label" htmlFor="quotaRank">
              رتبه سهمیه (اختیاری)
            </label>
            <input
              id="quotaRank"
              name="quotaRank"
              type="text"
              inputMode="numeric"
              defaultValue={prefill.quotaRank}
              className="gpj-input"
              aria-invalid={Boolean(fieldErrors.quotaRank)}
            />
            {fieldErrors.quotaRank && <p className="gpj-field__error">{fieldErrors.quotaRank}</p>}
          </div>

          <div className="gpj-field">
            <label className="gpj-field__label" htmlFor="score">
              تراز / نمره کل
            </label>
            <input
              id="score"
              name="score"
              type="text"
              inputMode="decimal"
              defaultValue={prefill.score}
              className="gpj-input"
              aria-invalid={Boolean(fieldErrors.score)}
            />
            {fieldErrors.score && <p className="gpj-field__error">{fieldErrors.score}</p>}
          </div>
        </div>

        <div className="gpj-field" style={{ marginTop: "1.25rem" }}>
          <label className="gpj-field__label" htmlFor="file">
            کارنامه رسمی سنجش (PDF)
          </label>
          {hasDocument && existingFileName ? (
            <p className="gpj-banner gpj-banner--success" style={{ marginBottom: "0.5rem" }}>
              فایل «{existingFileName}» قبلاً بارگذاری شده. برای جایگزینی فایل جدید
              انتخاب کن.
            </p>
          ) : null}
          <input
            id="file"
            name="file"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="gpj-input"
            aria-invalid={Boolean(fieldErrors.file)}
          />
          {fieldErrors.file && <p className="gpj-field__error">{fieldErrors.file}</p>}
        </div>

        <label className="gpj-checkbox-row" style={{ marginTop: "1.25rem" }}>
          <input type="checkbox" name="acknowledged" />
          <span className="gpj-checkbox-row__label">
            می‌پذیرم که مسئولیت صحت اعداد و اطلاعات واردشده بر عهده من است.
          </span>
        </label>
        {fieldErrors.acknowledged && <p className="gpj-field__error">{fieldErrors.acknowledged}</p>}

        <div style={{ marginTop: "1.5rem" }}>
          <GuidanceStepActions continueLabel="ثبت و ادامه" showSaveDraft={false} />
        </div>
      </form>
    </GuidanceStepShell>
  );
}
