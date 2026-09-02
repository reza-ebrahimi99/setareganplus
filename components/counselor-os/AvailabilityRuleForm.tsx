"use client";

import { useActionState } from "react";
import type { CounselorActionState } from "@/app/admin/counselor/actions";

const initial: CounselorActionState = {};

export function AvailabilityRuleForm({
  action,
}: {
  action: (
    state: CounselorActionState,
    formData: FormData,
  ) => Promise<CounselorActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="cos-form-stack">
      <label>
        روز هفته (۰=شنبه)
        <input name="weekday" type="number" min={0} max={6} defaultValue={0} required />
      </label>
      <label>
        شروع (HH:mm)
        <input name="startLocalTime" type="time" defaultValue="09:00" required />
      </label>
      <label>
        پایان (HH:mm)
        <input name="endLocalTime" type="time" defaultValue="17:00" required />
      </label>
      {state.error ? <p className="cos-error">{state.error}</p> : null}
      {state.success ? <p className="cos-success">{state.success}</p> : null}
      <button type="submit" className="cos-btn cos-btn--primary" disabled={pending}>
        {pending ? "در حال ثبت…" : "ثبت زمان آزاد"}
      </button>
    </form>
  );
}
