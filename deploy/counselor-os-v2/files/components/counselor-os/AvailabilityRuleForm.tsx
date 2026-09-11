"use client";

import { useActionState } from "react";
import type { CounselorActionState } from "@/app/admin/counselor/actions";
import { PERSIAN_WEEKDAYS } from "@/lib/counselor-os/labels";

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
        روز هفته
        <select name="weekday" defaultValue="0" required>
          {PERSIAN_WEEKDAYS.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        شروع (۲۴ ساعته)
        <input name="startLocalTime" type="time" defaultValue="09:00" required />
      </label>
      <label>
        پایان (۲۴ ساعته)
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
