"use client";

import { useActionState, useState, type FormEvent } from "react";
import { OtpSubmitButton } from "@/components/auth/OtpSubmitButton";
import {
  requestStaffOtpAction,
  verifyStaffOtpAction,
  type StaffLoginState,
} from "@/app/staff/login/actions";

const initial: StaffLoginState = { phase: "mobile" };

export function StaffOtpLoginForm({ nextPath }: { nextPath?: string }) {
  const [requestState, requestAction] = useActionState(
    requestStaffOtpAction,
    initial,
  );
  const [verifyState, verifyAction] = useActionState(
    verifyStaffOtpAction,
    initial,
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const serverError = verifyState.error ? verifyState.error : requestState.error;

  function validateMobileSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const input = form.elements.namedItem("mobile");
    const value =
      input && input instanceof HTMLInputElement ? input.value.trim() : "";
    if (!value) {
      event.preventDefault();
      setClientError("شماره موبایل را وارد کنید.");
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }
    setClientError(null);
  }

  function validateCodeSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const input = form.elements.namedItem("code");
    const value =
      input && input instanceof HTMLInputElement ? input.value.trim() : "";
    if (!value) {
      event.preventDefault();
      setClientError("کد یک‌بارمصرف را وارد کنید.");
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }
    setClientError(null);
  }

  if (requestState.phase === "otp") {
    return (
      <form
        action={verifyAction}
        onSubmit={validateCodeSubmit}
        className="relative z-10 space-y-4"
        noValidate
      >
        <input type="hidden" name="mobile" value={requestState.mobile} />
        {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
        <p className="rounded-xl border border-border bg-background px-4 py-3 text-sm leading-7 text-muted">
          {requestState.message}
        </p>
        {clientError || verifyState.error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {clientError ?? verifyState.error}
          </p>
        ) : null}
        <div>
          <label htmlFor="staff-code" className="text-sm font-medium text-primary">
            کد یک‌بارمصرف
          </label>
          <input
            id="staff-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            maxLength={6}
            enterKeyHint="done"
            className="mt-1.5 min-h-12 w-full touch-manipulation rounded-xl border border-border bg-white px-3 py-2.5 text-center text-lg tracking-[0.4em]"
            onChange={() => {
              if (clientError) setClientError(null);
            }}
          />
        </div>
        <OtpSubmitButton idleLabel="ورود امن" pendingLabel="در حال بررسی…" />
      </form>
    );
  }

  return (
    <form
      action={requestAction}
      onSubmit={validateMobileSubmit}
      className="relative z-10 space-y-4"
      noValidate
    >
      {clientError || serverError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {clientError ?? serverError}
        </p>
      ) : null}
      <div>
        <label
          htmlFor="staff-mobile"
          className="text-sm font-medium text-primary"
        >
          شماره موبایل سازمانی
        </label>
        <input
          id="staff-mobile"
          name="mobile"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          enterKeyHint="send"
          placeholder="09xxxxxxxxx"
          className="mt-1.5 min-h-12 w-full touch-manipulation rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
          onChange={() => {
            if (clientError) setClientError(null);
          }}
        />
      </div>
      <OtpSubmitButton
        idleLabel="دریافت کد ورود"
        pendingLabel="در حال ارسال…"
      />
    </form>
  );
}
