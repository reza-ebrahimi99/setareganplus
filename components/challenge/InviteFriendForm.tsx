"use client";

import { useActionState } from "react";
import {
  inviteChallengeFriendAction,
  type InviteFriendState,
} from "@/app/challenge/actions";
import { OtpSubmitButton } from "@/components/auth/OtpSubmitButton";
import { CopyShareButtons } from "@/components/challenge/CopyShareButtons";

const INITIAL: InviteFriendState = {};

export function InviteFriendForm() {
  const [state, action] = useActionState(inviteChallengeFriendAction, INITIAL);
  return (
    <div className="challenge-form-stack">
      {state.error ? <p className="challenge-alert challenge-alert-error">{state.error}</p> : null}
      {state.message ? <p className="challenge-alert challenge-alert-success">{state.message}</p> : null}
      {state.inviteUrl ? (
        <CopyShareButtons url={state.inviteUrl} text="دعوتت کردم به چالش ۵ نفره ریاضی؛ بیا هم‌تیمی من شو!" />
      ) : null}
      <form action={action} className="challenge-form-stack">
        <div className="challenge-form-grid">
          <label className="challenge-label">
            نام دوستت
            <input className="challenge-input" name="inviteeName" placeholder="مثلاً امیر" required />
          </label>
          <label className="challenge-label">
            شماره موبایل دوستت
            <input
              className="challenge-input"
              name="mobile"
              type="tel"
              inputMode="tel"
              placeholder="09123456789"
              dir="ltr"
              required
            />
          </label>
        </div>
        <OtpSubmitButton
          idleLabel="ارسال دعوت با پیامک"
          pendingLabel="در حال ثبت و ارسال…"
          className="challenge-button challenge-button-primary challenge-button-full"
        />
      </form>
    </div>
  );
}

