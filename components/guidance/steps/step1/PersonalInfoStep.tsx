"use client";

/**
 * Guidance Journey Engine — Step 1: Personal Information.
 */

import { useActionState, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitGuidanceStep1Action } from "@/app/portal/student/services/guidance/steps/actions/step1";
import { GuidanceStepActions } from "@/components/guidance/steps/GuidanceStepActions";
import { GuidanceStepShell } from "@/components/guidance/steps/GuidanceStepShell";
import { useGuidanceUnsavedWarning } from "@/components/guidance/steps/useGuidanceUnsavedWarning";
import { guidanceJourneyStepPath } from "@/lib/guidance/journey/steps";
import { GUIDANCE_QUOTA_OPTIONS } from "@/lib/guidance/journey/reference-data/quota";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";
import type { GuidanceStepFormState } from "@/lib/guidance/journey/types";

const EXAM_GROUP_LABELS: Record<string, string> = {
  MATHEMATICS: "ریاضی و فیزیک",
  EXPERIMENTAL_SCIENCES: "علوم تجربی",
  HUMANITIES: "علوم انسانی",
  ARTS: "هنر",
  LANGUAGES: "زبان‌های خارجی",
};

type PersonalInfoStepProps = {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  fullName: string;
  examGroup: string;
  hasTranscript: boolean;
  existingTranscriptName: string | null;
  provinces: readonly string[];
  prefill: {
    nationalId: string;
    gender: "MALE" | "FEMALE" | "";
    birthDate: string;
    province: string;
  };
};

const initial: GuidanceStepFormState = {};

export function PersonalInfoStep({
  sidebarSteps,
  completionPercentage,
  fullName,
  examGroup,
  hasTranscript,
  existingTranscriptName,
  provinces,
  prefill,
}: PersonalInfoStepProps) {
  const router = useRouter();
  const [state, action] = useActionState(submitGuidanceStep1Action, initial);
  const [clientError, setClientError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const celebrating = Boolean(state.ok);

  useGuidanceUnsavedWarning(dirty && !celebrating);

  useEffect(() => {
    if (!state.ok) return;
    const timer = setTimeout(() => {
      router.push(guidanceJourneyStepPath(2));
    }, 1400);
    return () => clearTimeout(timer);
  }, [state.ok, router]);

  const fieldErrors = state.fieldErrors ?? {};
  const examGroupLabel = useMemo(
    () => EXAM_GROUP_LABELS[examGroup] ?? examGroup,
    [examGroup],
  );

  function validate(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const required = [
      "fullName",
      "nationalId",
      "birthDate",
      "gender",
      "province",
      "quota",
      "highSchoolAverage",
    ] as const;
    for (const name of required) {
      const el = form.elements.namedItem(name);
      const value =
        el && "value" in el && typeof el.value === "string" ? el.value.trim() : "";
      if (!value) {
        event.preventDefault();
        setClientError("لطفاً همه فیلدهای الزامی را تکمیل کنید.");
        if (el instanceof HTMLElement) el.focus();
        return;
      }
    }
    const confirmed = form.elements.namedItem("confirmed");
    if (confirmed instanceof HTMLInputElement && !confirmed.checked) {
      event.preventDefault();
      setClientError("لطفاً صحت اطلاعات را تأیید کنید.");
      return;
    }
    if (!hasTranscript) {
      const file = form.elements.namedItem("file");
      if (file instanceof HTMLInputElement && file.files?.length === 0) {
        event.preventDefault();
        setClientError("بارگذاری کارنامه نهایی الزامی است.");
        return;
      }
    }
    setClientError(null);
  }

  return (
    <GuidanceStepShell
      stepId={1}
      stepCount={12}
      title="اطلاعات فردی"
      description="هویت، سهمیه و کارنامه نهایی را کامل کن تا پرونده انتخاب رشته‌ات باز شود."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
      celebrate={celebrating}
    >
      <form
        action={action}
        noValidate
        onSubmit={validate}
        onChange={() => setDirty(true)}
        encType="multipart/form-data"
        className="gpj-card"
      >
        <h2 className="gpj-card__title">مشخصات هویتی</h2>
        <p className="gpj-card__desc">
          این اطلاعات پایه پرونده هدایت تحصیلی توست. دقت کن که با کارنامه و کارت
          ملی مطابقت داشته باشد.
        </p>

        {(clientError || state.error) && (
          <p className="gpj-banner gpj-banner--error" role="alert" style={{ marginBottom: "1rem" }}>
            {clientError ?? state.error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="gpj-field sm:col-span-2">
            <label className="gpj-field__label" htmlFor="fullName">
              نام و نام خانوادگی
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              defaultValue={fullName}
              className="gpj-input"
              aria-invalid={Boolean(fieldErrors.fullName)}
            />
            {fieldErrors.fullName && <p className="gpj-field__error">{fieldErrors.fullName}</p>}
          </div>

          <div className="gpj-field">
            <label className="gpj-field__label" htmlFor="nationalId">
              کد ملی
            </label>
            <input
              id="nationalId"
              name="nationalId"
              type="text"
              inputMode="numeric"
              defaultValue={prefill.nationalId}
              className="gpj-input"
              aria-invalid={Boolean(fieldErrors.nationalId)}
            />
            {fieldErrors.nationalId && <p className="gpj-field__error">{fieldErrors.nationalId}</p>}
          </div>

          <div className="gpj-field">
            <label className="gpj-field__label" htmlFor="birthDate">
              تاریخ تولد
            </label>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              defaultValue={prefill.birthDate}
              className="gpj-input"
              aria-invalid={Boolean(fieldErrors.birthDate)}
            />
            {fieldErrors.birthDate && <p className="gpj-field__error">{fieldErrors.birthDate}</p>}
          </div>

          <div className="gpj-field">
            <span className="gpj-field__label">جنسیت</span>
            <div className="flex gap-4 py-1.5">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="gender"
                  value="MALE"
                  defaultChecked={prefill.gender === "MALE"}
                />
                پسر
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="gender"
                  value="FEMALE"
                  defaultChecked={prefill.gender === "FEMALE"}
                />
                دختر
              </label>
            </div>
            {fieldErrors.gender && <p className="gpj-field__error">{fieldErrors.gender}</p>}
          </div>

          <div className="gpj-field">
            <label className="gpj-field__label" htmlFor="province">
              استان محل سکونت
            </label>
            <select
              id="province"
              name="province"
              defaultValue={prefill.province || ""}
              className="gpj-select"
              aria-invalid={Boolean(fieldErrors.province)}
            >
              <option value="" disabled>
                انتخاب استان
              </option>
              {provinces.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
            {fieldErrors.province && <p className="gpj-field__error">{fieldErrors.province}</p>}
          </div>

          <div className="gpj-field">
            <label className="gpj-field__label" htmlFor="quota">
              سهمیه پذیرش
            </label>
            <select
              id="quota"
              name="quota"
              defaultValue=""
              className="gpj-select"
              aria-invalid={Boolean(fieldErrors.quota)}
            >
              <option value="" disabled>
                انتخاب سهمیه
              </option>
              {GUIDANCE_QUOTA_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldErrors.quota && <p className="gpj-field__error">{fieldErrors.quota}</p>}
          </div>

          <div className="gpj-field">
            <label className="gpj-field__label" htmlFor="highSchoolAverage">
              معدل کل دیپلم (از ۲۰)
            </label>
            <input
              id="highSchoolAverage"
              name="highSchoolAverage"
              type="text"
              inputMode="decimal"
              placeholder="مثلاً ۱۸.۵۰"
              className="gpj-input"
              aria-invalid={Boolean(fieldErrors.highSchoolAverage)}
            />
            {fieldErrors.highSchoolAverage && (
              <p className="gpj-field__error">{fieldErrors.highSchoolAverage}</p>
            )}
          </div>

          <div className="gpj-field">
            <span className="gpj-field__label">گروه آزمایشی</span>
            <input
              type="text"
              disabled
              value={examGroupLabel}
              className="gpj-input"
              style={{ background: "#f8fafc", color: "#64748b" }}
            />
            <p className="gpj-field__hint">
              گروه آزمایشی از پیش‌ثبت‌نام تعیین شده و اینجا فقط نمایش داده می‌شود.
            </p>
          </div>
        </div>

        <div className="gpj-field" style={{ marginTop: "1.25rem" }}>
          <label className="gpj-field__label" htmlFor="file">
            کارنامه نهایی (PDF)
          </label>
          {hasTranscript && existingTranscriptName ? (
            <p className="gpj-banner gpj-banner--success" style={{ marginBottom: "0.5rem" }}>
              کارنامه «{existingTranscriptName}» قبلاً بارگذاری شده. برای جایگزینی
              فایل جدیدی انتخاب کن، در غیر این صورت خالی بگذار.
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
          <input type="checkbox" name="confirmed" />
          <span className="gpj-checkbox-row__label">
            تأیید می‌کنم تمام اطلاعات وارد‌شده صحیح است.
          </span>
        </label>
        {fieldErrors.confirmed && <p className="gpj-field__error">{fieldErrors.confirmed}</p>}

        <div style={{ marginTop: "1.5rem" }}>
          <GuidanceStepActions
            continueLabel="ثبت و ادامه به آزمون رغبت"
            showSaveDraft={false}
          />
        </div>
      </form>
    </GuidanceStepShell>
  );
}
