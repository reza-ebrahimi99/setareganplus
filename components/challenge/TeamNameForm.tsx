"use client";

import { useActionState } from "react";
import {
  updateChallengeTeamNameAction,
  type ChallengeTeamNameState,
} from "@/app/challenge/team/actions";
import { OtpSubmitButton } from "@/components/auth/OtpSubmitButton";

const INITIAL: ChallengeTeamNameState = { status: "idle", message: "" };

export function TeamNameForm({ currentName }: { currentName: string }) {
  const [state, action] = useActionState(updateChallengeTeamNameAction, INITIAL);

  return (
    <form action={action} className="challenge-form-stack">
      {state.status === "error" ? (
        <p className="challenge-alert challenge-alert-error" role="alert">{state.message}</p>
      ) : null}
      {state.status === "success" ? (
        <p className="challenge-alert challenge-alert-success" role="status">{state.message}</p>
      ) : null}
      <label className="challenge-label">
        نام تیم
        <input
          className="challenge-input"
          name="teamName"
          defaultValue={currentName}
          minLength={3}
          maxLength={40}
          required
        />
      </label>
      <OtpSubmitButton
        idleLabel="ذخیره نام تیم"
        pendingLabel="در حال ذخیره…"
        className="challenge-button challenge-button-secondary challenge-button-full"
      />
    </form>
  );
}
