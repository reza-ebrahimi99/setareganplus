"use client";

import { useActionState } from "react";
import {
  saveAppointmentReportAction,
  type AppointmentActionState,
} from "@/app/admin/counselor/appointment-actions";

const initial: AppointmentActionState = {};

export function AppointmentSessionReportForm(props: {
  sessionId: string;
  defaults: {
    keyPoints: string;
    decisions: string;
    layoutChangeNotes: string;
    followUpItems: string;
    studentActionItems: string;
    counselorActionItems: string;
    summary: string;
    counselorInternalNotes: string;
    sessionOutcome: string;
  };
  locked: boolean;
}) {
  const [state, action, pending] = useActionState(saveAppointmentReportAction, initial);

  return (
    <section className="cos-panel">
      <h2>گزارش دیجیتال جلسه</h2>
      {state.error ? <p className="cos-banner cos-banner--error">{state.error}</p> : null}
      {state.success ? <p className="cos-banner cos-banner--ok">{state.success}</p> : null}
      <form action={action} className="cos-form-stack">
        <input type="hidden" name="sessionId" value={props.sessionId} />
        {(
          [
            ["keyPoints", "موضوعات مطرح‌شده"],
            ["decisions", "تصمیمات جلسه"],
            ["layoutChangeNotes", "تغییرات موردنیاز در چیدمان"],
            ["followUpItems", "موارد نیازمند پیگیری"],
            ["studentActionItems", "وظیفه دانش‌آموز"],
            ["counselorActionItems", "وظیفه مشاور / آموزشگاه"],
            ["summary", "خلاصه / نتیجه جلسه"],
            ["counselorInternalNotes", "یادdاشت داخلی (فقط مشاور)"],
            ["sessionOutcome", "نتیجه جلسه"],
          ] as const
        ).map(([name, label]) => (
          <label key={name}>
            {label}
            <textarea
              name={name}
              rows={3}
              defaultValue={props.defaults[name]}
              disabled={props.locked}
            />
          </label>
        ))}
        <label>
          تاریخ پیگیری بعدی
          <input type="datetime-local" name="nextFollowUpAt" disabled={props.locked} />
        </label>
        <label>
          شروع واقعی
          <input type="datetime-local" name="startedAt" disabled={props.locked} />
        </label>
        <label>
          پایان واقعی
          <input type="datetime-local" name="endedAt" disabled={props.locked} />
        </label>
        <div className="cos-inline-actions">
          <button type="submit" name="intent" value="draft" className="cos-btn cos-btn--ghost" disabled={pending || props.locked}>
            ذخیره پیش‌نویس
          </button>
          <button type="submit" name="intent" value="complete" className="cos-btn cos-btn--primary" disabled={pending || props.locked}>
            تکمیل جلسه
          </button>
        </div>
      </form>
    </section>
  );
}
