"use client";

import { useActionState } from "react";
import { OtpSubmitButton } from "@/components/auth/OtpSubmitButton";
import {
  requestAcademyOtpAction,
  verifyAcademyOtpAction,
  type AcademyLoginState,
} from "@/app/academy/login/actions";

const initial: AcademyLoginState = { phase: "mobile" };

export function AcademyLoginForm({ next }: { next?: string }) {
  const [requestState, requestAction] = useActionState(
    requestAcademyOtpAction,
    initial,
  );
  const [verifyState, verifyAction] = useActionState(
    verifyAcademyOtpAction,
    initial,
  );

  const state = verifyState.phase === "otp" || verifyState.error || verifyState.message
    ? verifyState
    : requestState;
  const phase = state.phase;
  const mobile = state.mobile ?? "";

  return (
    <div className="space-y-4">
      {state.error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{state.message}</p>
      ) : null}

      {phase === "mobile" ? (
        <form action={requestAction} className="space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />
          <label className="block text-sm font-medium text-primary">
            شماره موبایل
            <input
              name="mobile"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="09123456789"
              dir="ltr"
              className="academy-field text-left"
              required
            />
          </label>
          <OtpSubmitButton
            idleLabel="دریافت کد ورود"
            pendingLabel="در حال ارسال…"
            className="academy-btn academy-btn-primary w-full"
          />
        </form>
      ) : (
        <form action={verifyAction} className="space-y-4">
          <input type="hidden" name="mobile" value={mobile} />
          <input type="hidden" name="next" value={next ?? state.next ?? ""} />
          <label className="block text-sm font-medium text-primary">
            کد تأیید
            <input
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              className="academy-field text-center tracking-widest"
              required
            />
          </label>
          <OtpSubmitButton
            idleLabel="ورود"
            pendingLabel="در حال بررسی…"
            className="academy-btn academy-btn-primary w-full"
          />
        </form>
      )}
    </div>
  );
}
