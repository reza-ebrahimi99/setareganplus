"use client";

import { useActionState } from "react";
import {
  requestPortalOtpAction,
  verifyPortalOtpAction,
  type PortalLoginState,
} from "@/app/portal/login/actions";

const initial: PortalLoginState = { phase: "mobile" };

export function PortalLoginForm() {
  const [requestState, requestAction, requesting] = useActionState(
    requestPortalOtpAction,
    initial,
  );
  const [verifyState, verifyAction, verifying] = useActionState(
    verifyPortalOtpAction,
    initial,
  );
  const state = verifyState.error ? verifyState : requestState;

  if (requestState.phase === "otp") {
    return (
      <form action={verifyAction} className="space-y-4">
        <input type="hidden" name="mobile" value={requestState.mobile} />
        <p className="rounded-xl border border-border bg-background px-4 py-3 text-sm leading-7 text-muted">
          {state.error ?? requestState.message}
        </p>
        <div>
          <label
            htmlFor="portal-code"
            className="text-sm font-medium text-primary"
          >
            کد یک‌بارمصرف
          </label>
          <input
            id="portal-code"
            name="code"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            maxLength={6}
            className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-center text-lg tracking-[0.4em]"
          />
        </div>
        <button
          disabled={verifying}
          className="inline-flex w-full justify-center rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {verifying ? "در حال بررسی…" : "ورود به پرتال"}
        </button>
      </form>
    );
  }

  return (
    <form action={requestAction} className="space-y-4">
      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.error}
        </p>
      ) : null}
      <div>
        <label
          htmlFor="portal-mobile"
          className="text-sm font-medium text-primary"
        >
          شماره موبایل
        </label>
        <input
          id="portal-mobile"
          name="mobile"
          required
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          placeholder="09xxxxxxxxx"
          className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
        />
      </div>
      <button
        disabled={requesting}
        className="inline-flex w-full justify-center rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {requesting ? "در حال ارسال…" : "دریافت کد ورود"}
      </button>
    </form>
  );
}
