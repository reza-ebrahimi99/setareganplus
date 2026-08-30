"use client";

/**
 * Guidance ERP — public pre-registration multi-step form (collect → OTP → done).
 */

import { useActionState, useState, type FormEvent } from "react";
import { OtpSubmitButton } from "@/components/auth/OtpSubmitButton";
import {
  requestGuidancePreRegisterOtpAction,
  verifyGuidancePreRegisterOtpAction,
  type GuidancePreRegisterState,
} from "@/app/guidance/pre-register/actions";
import { GUIDANCE_PRE_REG_CONSENT_TEXT } from "@/lib/guidance/consent";
import { GUIDANCE_EXAM_GROUPS } from "@/lib/guidance/types";

const EXAM_GROUP_LABELS: Record<(typeof GUIDANCE_EXAM_GROUPS)[number], string> =
  {
    MATHEMATICS: "ریاضی",
    EXPERIMENTAL_SCIENCES: "تجربی",
    HUMANITIES: "انسانی",
    ARTS: "هنر",
    LANGUAGES: "زبان",
  };

type GradeOption = { id: string; name: string };

type GuidancePreRegisterFormProps = {
  grades: readonly GradeOption[];
};

const initial: GuidancePreRegisterState = { phase: "form" };

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm";

export function GuidancePreRegisterForm({ grades }: GuidancePreRegisterFormProps) {
  const [requestState, requestAction] = useActionState(
    requestGuidancePreRegisterOtpAction,
    initial,
  );
  const [verifyState, verifyAction] = useActionState(
    verifyGuidancePreRegisterOtpAction,
    initial,
  );
  const [clientError, setClientError] = useState<string | null>(null);

  const state =
    verifyState.phase === "done"
      ? verifyState
      : verifyState.error
        ? verifyState
        : requestState;

  function validateRequestSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const mobileInput = form.elements.namedItem("mobile");
    const mobile =
      mobileInput && mobileInput instanceof HTMLInputElement
        ? mobileInput.value.trim()
        : "";
    if (!mobile) {
      event.preventDefault();
      setClientError("شماره موبایل را وارد کنید.");
      if (mobileInput instanceof HTMLInputElement) mobileInput.focus();
      return;
    }
    setClientError(null);
  }

  function validateOtpSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const codeInput = form.elements.namedItem("code");
    const code =
      codeInput && codeInput instanceof HTMLInputElement
        ? codeInput.value.trim()
        : "";
    if (!code) {
      event.preventDefault();
      setClientError("کد یک‌بارمصرف را وارد کنید.");
      if (codeInput instanceof HTMLInputElement) codeInput.focus();
      return;
    }
    setClientError(null);
  }

  if (state.phase === "done") {
    return (
      <div className="space-y-4 rounded-2xl border border-success/20 bg-success/5 p-6">
        <h2 className="text-lg font-semibold text-primary">پیش‌ثبت‌نام تکمیل شد</h2>
        <p className="text-sm leading-7 text-muted">{state.message}</p>
        {state.planPublicId ? (
          <p className="text-sm text-foreground" dir="ltr">
            کد پیگیری پرونده:{" "}
            <span className="font-medium">{state.planPublicId}</span>
          </p>
        ) : null}
        <p className="text-sm leading-7 text-muted">
          گام بعدی را از پرتال دانش‌آموز، بخش «انتخاب رشته» ادامه دهید: بارگذاری
          کارنامه و پیگیری مسیر.
        </p>
        <a
          href="/portal/student/services/guidance"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white"
        >
          ادامه در پرتال
        </a>
      </div>
    );
  }

  if (state.phase === "otp") {
    return (
      <form
        action={verifyAction}
        onSubmit={validateOtpSubmit}
        className="relative z-10 space-y-4"
        noValidate
      >
        <input type="hidden" name="mobile" value={state.mobile ?? ""} />
        <input type="hidden" name="firstName" value={state.firstName ?? ""} />
        <input type="hidden" name="lastName" value={state.lastName ?? ""} />
        <input type="hidden" name="examGroup" value={state.examGroup ?? ""} />
        <input type="hidden" name="gradeId" value={state.gradeId ?? ""} />
        <input type="hidden" name="consent" value="true" />

        <p className="rounded-xl border border-border bg-background px-4 py-3 text-sm leading-7 text-muted">
          {state.message}
        </p>
        {clientError || state.error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {clientError ?? state.error}
          </p>
        ) : null}

        <div>
          <label htmlFor="guidance-otp" className="text-sm font-medium text-primary">
            کد یک‌بارمصرف
          </label>
          <input
            id="guidance-otp"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            maxLength={6}
            enterKeyHint="done"
            className={`${fieldClass} min-h-12 touch-manipulation text-center text-lg tracking-[0.4em]`}
            onChange={() => {
              if (clientError) setClientError(null);
            }}
          />
        </div>

        <OtpSubmitButton
          idleLabel="تأیید و تشکیل پرونده"
          pendingLabel="در حال تأیید…"
        />
      </form>
    );
  }

  return (
    <form
      action={requestAction}
      onSubmit={validateRequestSubmit}
      className="relative z-10 space-y-4"
      noValidate
    >
      {clientError || state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {clientError ?? state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="guidance-first-name" className="text-sm font-medium text-primary">
            نام
          </label>
          <input
            id="guidance-first-name"
            name="firstName"
            required
            defaultValue={state.firstName}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="guidance-last-name" className="text-sm font-medium text-primary">
            نام خانوادگی
          </label>
          <input
            id="guidance-last-name"
            name="lastName"
            required
            defaultValue={state.lastName}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="guidance-mobile" className="text-sm font-medium text-primary">
          شماره موبایل
        </label>
        <input
          id="guidance-mobile"
          name="mobile"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          enterKeyHint="send"
          placeholder="09xxxxxxxxx"
          defaultValue={state.mobile}
          className={`${fieldClass} min-h-12 touch-manipulation`}
          onChange={() => {
            if (clientError) setClientError(null);
          }}
        />
      </div>

      <div>
        <label htmlFor="guidance-exam-group" className="text-sm font-medium text-primary">
          گروه آزمایشی
        </label>
        <select
          id="guidance-exam-group"
          name="examGroup"
          required
          defaultValue={state.examGroup ?? ""}
          className={fieldClass}
        >
          <option value="" disabled>
            انتخاب کنید
          </option>
          {GUIDANCE_EXAM_GROUPS.map((group) => (
            <option key={group} value={group}>
              {EXAM_GROUP_LABELS[group]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="guidance-grade" className="text-sm font-medium text-primary">
          پایه تحصیلی
        </label>
        <select
          id="guidance-grade"
          name="gradeId"
          required
          defaultValue={state.gradeId ?? ""}
          className={fieldClass}
        >
          <option value="" disabled>
            انتخاب کنید
          </option>
          {grades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.name}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm leading-7 text-muted">
        <input
          type="checkbox"
          name="consent"
          value="true"
          required
          className="mt-1.5 size-4 shrink-0 rounded border-border"
        />
        <span>{GUIDANCE_PRE_REG_CONSENT_TEXT}</span>
      </label>

      <OtpSubmitButton
        idleLabel="دریافت کد تأیید"
        pendingLabel="در حال ارسال کد…"
      />
    </form>
  );
}
