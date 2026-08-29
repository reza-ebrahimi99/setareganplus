"use client";

import { useActionState } from "react";
import {
  requestStaffOtpAction,
  verifyStaffOtpAction,
  type StaffLoginState,
} from "@/app/staff/login/actions";

const initial: StaffLoginState = { phase: "mobile" };

export function StaffOtpLoginForm() {
  const [requestState, requestAction, requesting] = useActionState(requestStaffOtpAction, initial);
  const [verifyState, verifyAction, verifying] = useActionState(verifyStaffOtpAction, initial);
  const state = verifyState.error ? verifyState : requestState;

  if (requestState.phase === "otp") {
    return (
      <form action={verifyAction} className="space-y-4">
        <input type="hidden" name="mobile" value={requestState.mobile} />
        <p className="rounded-xl border border-border bg-background px-4 py-3 text-sm leading-7 text-muted">{state.error ?? requestState.message}</p>
        <div>
          <label htmlFor="staff-code" className="text-sm font-medium text-primary">کد یک‌بارمصرف</label>
          <input id="staff-code" name="code" required inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-center text-lg tracking-[0.4em]" />
        </div>
        <button disabled={verifying} className="inline-flex w-full justify-center rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
          {verifying ? "در حال بررسی…" : "ورود امن"}
        </button>
      </form>
    );
  }

  return (
    <form action={requestAction} className="space-y-4">
      {state.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</p>}
      <div>
        <label htmlFor="staff-mobile" className="text-sm font-medium text-primary">شماره موبایل سازمانی</label>
        <input id="staff-mobile" name="mobile" required inputMode="tel" autoComplete="tel" dir="ltr" placeholder="09xxxxxxxxx" className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm" />
      </div>
      <button disabled={requesting} className="inline-flex w-full justify-center rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
        {requesting ? "در حال ارسال…" : "دریافت کد ورود"}
      </button>
    </form>
  );
}
