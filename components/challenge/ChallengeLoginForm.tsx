"use client";

import { useActionState, useState } from "react";
import {
  requestChallengeOtpAction,
  verifyChallengeOtpAction,
  type ChallengeLoginState,
} from "@/app/challenge/login/actions";
import { OtpSubmitButton } from "@/components/auth/OtpSubmitButton";
import { CHALLENGE_GRADES, CHALLENGE_MAJORS } from "@/lib/challenge/constants";

const INITIAL: ChallengeLoginState = { phase: "profile" };

export function ChallengeLoginForm(props: {
  inviteToken?: string;
  teamCode?: string;
  lockedMobile?: string;
  suggestedName?: string;
  restartHref?: string;
}) {
  const [requestState, requestAction] = useActionState(
    requestChallengeOtpAction,
    INITIAL,
  );
  const [verifyState, verifyAction] = useActionState(
    verifyChallengeOtpAction,
    INITIAL,
  );
  const state =
    verifyState.phase === "otp" || verifyState.error || verifyState.message
      ? verifyState
      : requestState;
  const initialGrade = state.gradeKey ?? "";
  const [gradeKey, setGradeKey] = useState(initialGrade);
  const gradeHasMajor = CHALLENGE_GRADES.some(
    (grade) => grade.key === gradeKey && grade.hasMajor,
  );

  return (
    <div className="challenge-form-stack">
      <div className="challenge-login-steps" aria-label="مراحل ورود">
        <span className={state.phase === "profile" ? "is-active" : "is-done"}>
          <b>۱</b> اطلاعات من
        </span>
        <span className={state.phase === "otp" ? "is-active" : ""}>
          <b>۲</b> کد ورود
        </span>
        <span>
          <b>۳</b> تیم من
        </span>
      </div>

      {state.error ? (
        <p className="challenge-alert challenge-alert-error" role="alert" aria-live="polite">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="challenge-alert challenge-alert-success" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      {state.phase === "otp" ? (
        <form action={verifyAction} className="challenge-form-stack">
          <input type="hidden" name="fullName" value={state.fullName ?? ""} />
          <input type="hidden" name="mobile" value={state.mobile ?? ""} />
          <input type="hidden" name="gradeKey" value={state.gradeKey ?? ""} />
          <input type="hidden" name="majorKey" value={state.majorKey ?? ""} />
          <input type="hidden" name="inviteToken" value={state.inviteToken ?? ""} />
          <input type="hidden" name="teamCode" value={state.teamCode ?? ""} />
          <input type="hidden" name="teamName" value={state.teamName ?? ""} />
          <label className="challenge-label">
            کد یک‌بارمصرف
            <input
              className="challenge-input challenge-otp-input"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              dir="ltr"
              required
              autoFocus
            />
          </label>
          <p className="challenge-hint">کد ۶ رقمی ارسال‌شده به {state.mobile}</p>
          <OtpSubmitButton
            idleLabel="تأیید و ورود به چالش"
            pendingLabel="در حال بررسی…"
            className="challenge-button challenge-button-primary challenge-button-full"
          />
          <a className="challenge-login-back" href={props.restartHref ?? "/login"}>
            شماره یا اطلاعات را اشتباه وارد کردم
          </a>
        </form>
      ) : (
        <form action={requestAction} className="challenge-form-stack">
          <input type="hidden" name="inviteToken" value={props.inviteToken ?? ""} />
          <input type="hidden" name="teamCode" value={props.teamCode ?? ""} />
          <label className="challenge-label">
            نام و نام خانوادگی
            <input
              className="challenge-input"
              name="fullName"
              autoComplete="name"
              defaultValue={state.fullName ?? props.suggestedName ?? ""}
              placeholder="مثلاً آوا محمدی"
              required
            />
          </label>
          <label className="challenge-label">
            شماره موبایل
            <input
              className="challenge-input"
              name="mobile"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={state.mobile ?? props.lockedMobile ?? ""}
              readOnly={Boolean(props.lockedMobile)}
              placeholder="09123456789"
              dir="ltr"
              required
            />
          </label>
          {!props.inviteToken && !props.teamCode ? (
            <label className="challenge-label">
              نام تیم (اختیاری)
              <input
                className="challenge-input"
                name="teamName"
                defaultValue={state.teamName ?? ""}
                minLength={3}
                maxLength={40}
                placeholder="مثلاً ستاره‌های ریاضی"
              />
              <span className="challenge-hint">بعداً هم سرگروه می‌تواند نام تیم را تغییر دهد.</span>
            </label>
          ) : null}
          <div className="challenge-form-grid">
            <label className="challenge-label">
              پایه تحصیلی
              <select
                className="challenge-input"
                name="gradeKey"
                value={gradeKey}
                onChange={(event) => setGradeKey(event.target.value)}
                required
              >
                <option value="">انتخاب پایه</option>
                {CHALLENGE_GRADES.map((grade) => (
                  <option key={grade.key} value={grade.key}>{grade.label}</option>
                ))}
              </select>
            </label>
            <label className="challenge-label">
              رشته
              <select
                className="challenge-input"
                name="majorKey"
                defaultValue={state.majorKey ?? ""}
                disabled={!gradeHasMajor}
                required={gradeHasMajor}
              >
                <option value="">{gradeHasMajor ? "انتخاب رشته" : "برای این پایه لازم نیست"}</option>
                {CHALLENGE_MAJORS.map((major) => (
                  <option key={major.key} value={major.key}>{major.label}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="challenge-consent">
            <input type="checkbox" name="consent" required />
            <span>
              <a href="#challenge-rules">قوانین چالش</a>، دریافت پیامک ورود و پیام‌های ضروری کمپین را می‌پذیرم.
            </span>
          </label>
          <OtpSubmitButton
            idleLabel={
              props.inviteToken || props.teamCode
                ? "دریافت کد و پیوستن به تیم"
                : "دریافت کد و ساخت تیم"
            }
            pendingLabel="در حال ارسال کد…"
            className="challenge-button challenge-button-primary challenge-button-full"
          />
        </form>
      )}
    </div>
  );
}
