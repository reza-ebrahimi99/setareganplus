"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { OtpSubmitButton } from "@/components/auth/OtpSubmitButton";
import {
  loginAdminAction,
  requestAdminOtpLoginAction,
  requestAdminPasswordResetAction,
  resetAdminPasswordAction,
  verifyAdminOtpLoginAction,
  verifyAdminPasswordResetOtpAction,
  type AdminOtpLoginState,
  type AdminPasswordResetState,
  type LoginState,
} from "@/app/admin/login/actions";

type Mode = "password" | "otp" | "forgot";

const passwordInitial: LoginState = {};
const otpInitial: AdminOtpLoginState = { phase: "mobile" };
const resetInitial: AdminPasswordResetState = { phase: "mobile" };

const tabClass = (active: boolean) =>
  `flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? "bg-primary text-white"
      : "bg-background text-muted hover:text-primary"
  }`;

export function AdminLoginForm({ nextPath }: { nextPath?: string }) {
  const [mode, setMode] = useState<Mode>("password");
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const [passwordState, passwordAction, passwordPending] = useActionState(
    loginAdminAction,
    passwordInitial,
  );
  const [otpRequestState, otpRequestAction] = useActionState(
    requestAdminOtpLoginAction,
    otpInitial,
  );
  const [otpVerifyState, otpVerifyAction] = useActionState(
    verifyAdminOtpLoginAction,
    otpInitial,
  );
  const [resetRequestState, resetRequestAction, resetRequesting] =
    useActionState(requestAdminPasswordResetAction, resetInitial);
  const [resetVerifyState, resetVerifyAction, resetVerifying] = useActionState(
    verifyAdminPasswordResetOtpAction,
    resetInitial,
  );
  const [resetPasswordState, resetPasswordAction, resetPasswordPending] =
    useActionState(resetAdminPasswordAction, resetInitial);
  const [otpClientError, setOtpClientError] = useState<string | null>(null);

  const otpState = otpVerifyState.error ? otpVerifyState : otpRequestState;

  function validateOtpMobileSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const input = form.elements.namedItem("mobile");
    const value =
      input && input instanceof HTMLInputElement ? input.value.trim() : "";
    if (!value) {
      event.preventDefault();
      setOtpClientError("شماره موبایل را وارد کنید.");
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }
    setOtpClientError(null);
  }

  function validateOtpCodeSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const input = form.elements.namedItem("code");
    const value =
      input && input instanceof HTMLInputElement ? input.value.trim() : "";
    if (!value) {
      event.preventDefault();
      setOtpClientError("کد یک‌بارمصرف را وارد کنید.");
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }
    setOtpClientError(null);
  }

  let resetState: AdminPasswordResetState = resetRequestState;
  if (resetVerifyState.phase === "reset" || resetVerifyState.error) {
    resetState = resetVerifyState;
  }
  if (resetPasswordState.error && resetPasswordState.phase === "reset") {
    resetState = resetPasswordState;
  }

  useEffect(() => {
    if (
      resetPasswordState.message &&
      resetPasswordState.phase === "mobile" &&
      !resetPasswordState.error
    ) {
      const id = window.requestAnimationFrame(() => {
        setResetSuccess(resetPasswordState.message ?? null);
        setMode("password");
      });
      return () => window.cancelAnimationFrame(id);
    }
  }, [resetPasswordState]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-xl border border-border bg-background/70 p-1">
        <button
          type="button"
          className={tabClass(mode === "password")}
          onClick={() => setMode("password")}
        >
          رمز عبور
        </button>
        <button
          type="button"
          className={tabClass(mode === "otp")}
          onClick={() => setMode("otp")}
        >
          کد یک‌بارمصرف
        </button>
      </div>

      {mode === "password" ? (
        <form action={passwordAction} className="space-y-4" noValidate>
          {nextPath ? (
            <input type="hidden" name="next" value={nextPath} />
          ) : null}

          {passwordState.formError ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
            >
              {passwordState.formError}
            </div>
          ) : null}

          {resetSuccess ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900">
              {resetSuccess}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="identifier"
              className="text-sm font-medium text-primary"
            >
              ایمیل یا موبایل
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              autoComplete="username"
              dir="ltr"
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-primary"
            >
              رمز عبور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            />
          </div>

          <button
            type="submit"
            disabled={passwordPending}
            className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {passwordPending ? "در حال ورود…" : "ورود"}
          </button>

          <button
            type="button"
            className="w-full text-center text-sm text-secondary underline-offset-4 hover:underline"
            onClick={() => {
              setResetSuccess(null);
              setMode("forgot");
            }}
          >
            رمز عبور را فراموش کرده‌ام
          </button>
        </form>
      ) : null}

      {mode === "otp" ? (
        otpRequestState.phase === "otp" ? (
          <form
            action={otpVerifyAction}
            onSubmit={validateOtpCodeSubmit}
            className="relative z-10 space-y-4"
            noValidate
          >
            <input type="hidden" name="mobile" value={otpRequestState.mobile} />
            {nextPath ? (
              <input type="hidden" name="next" value={nextPath} />
            ) : null}
            <p className="rounded-xl border border-border bg-background px-4 py-3 text-sm leading-7 text-muted">
              {otpRequestState.message}
            </p>
            {otpClientError || otpVerifyState.error ? (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {otpClientError ?? otpVerifyState.error}
              </p>
            ) : null}
            <div>
              <label
                htmlFor="admin-otp-code"
                className="text-sm font-medium text-primary"
              >
                کد یک‌بارمصرف
              </label>
              <input
                id="admin-otp-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                maxLength={6}
                enterKeyHint="done"
                className="mt-1.5 min-h-12 w-full touch-manipulation rounded-xl border border-border bg-white px-3 py-2.5 text-center text-lg tracking-[0.4em]"
                onChange={() => {
                  if (otpClientError) setOtpClientError(null);
                }}
              />
            </div>
            <OtpSubmitButton
              idleLabel="ورود با کد"
              pendingLabel="در حال بررسی…"
            />
            <button
              type="button"
              className="w-full text-center text-sm text-muted"
              onClick={() => setMode("password")}
            >
              بازگشت به ورود با رمز
            </button>
          </form>
        ) : (
          <form
            action={otpRequestAction}
            onSubmit={validateOtpMobileSubmit}
            className="relative z-10 space-y-4"
            noValidate
          >
            {otpClientError || otpState.error ? (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {otpClientError ?? otpState.error}
              </p>
            ) : (
              <p className="text-sm leading-7 text-muted">
                فقط همکاران سازمانی می‌توانند با کد یک‌بارمصرف وارد پنل مدیریت
                شوند.
              </p>
            )}
            <div>
              <label
                htmlFor="admin-otp-mobile"
                className="text-sm font-medium text-primary"
              >
                شماره موبایل سازمانی
              </label>
              <input
                id="admin-otp-mobile"
                name="mobile"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                enterKeyHint="send"
                placeholder="09xxxxxxxxx"
                className="mt-1.5 min-h-12 w-full touch-manipulation rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
                onChange={() => {
                  if (otpClientError) setOtpClientError(null);
                }}
              />
            </div>
            <OtpSubmitButton
              idleLabel="دریافت کد ورود"
              pendingLabel="در حال ارسال…"
            />
          </form>
        )
      ) : null}

      {mode === "forgot" ? (
        resetState.phase === "reset" && resetState.challengeId ? (
          <form action={resetPasswordAction} className="space-y-4">
            <input type="hidden" name="mobile" value={resetState.mobile} />
            <input
              type="hidden"
              name="challengeId"
              value={resetState.challengeId}
            />
            {resetState.error ? (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {resetState.error}
              </p>
            ) : (
              <p className="rounded-xl border border-border bg-background px-4 py-3 text-sm leading-7 text-muted">
                {resetState.message}
              </p>
            )}
            <div>
              <label
                htmlFor="new-password"
                className="text-sm font-medium text-primary"
              >
                رمز عبور جدید
              </label>
              <input
                id="new-password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="text-sm font-medium text-primary"
              >
                تکرار رمز عبور
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
              />
            </div>
            <button
              disabled={resetPasswordPending}
              className="inline-flex w-full justify-center rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {resetPasswordPending ? "در حال ذخیره…" : "ثبت رمز جدید"}
            </button>
          </form>
        ) : resetState.phase === "otp" ? (
          <form action={resetVerifyAction} className="space-y-4">
            <input type="hidden" name="mobile" value={resetState.mobile} />
            <p className="rounded-xl border border-border bg-background px-4 py-3 text-sm leading-7 text-muted">
              {resetState.error ?? resetState.message}
            </p>
            <div>
              <label
                htmlFor="reset-otp-code"
                className="text-sm font-medium text-primary"
              >
                کد یک‌بارمصرف
              </label>
              <input
                id="reset-otp-code"
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
              disabled={resetVerifying}
              className="inline-flex w-full justify-center rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {resetVerifying ? "در حال بررسی…" : "تأیید کد"}
            </button>
          </form>
        ) : (
          <form action={resetRequestAction} className="space-y-4">
            {resetState.error ? (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {resetState.error}
              </p>
            ) : (
              <p className="text-sm leading-7 text-muted">
                شماره موبایل سازمانی خود را وارد کنید. فقط حساب همکاران می‌توانند
                رمز را بازیابی کنند.
              </p>
            )}
            <div>
              <label
                htmlFor="reset-mobile"
                className="text-sm font-medium text-primary"
              >
                شماره موبایل
              </label>
              <input
                id="reset-mobile"
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
              disabled={resetRequesting}
              className="inline-flex w-full justify-center rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {resetRequesting ? "در حال ارسال…" : "ارسال کد بازیابی"}
            </button>
            <button
              type="button"
              className="w-full text-center text-sm text-muted"
              onClick={() => setMode("password")}
            >
              بازگشت به ورود
            </button>
          </form>
        )
      ) : null}
    </div>
  );
}
