"use client";

import { useActionState } from "react";
import {
  saveSessionRecordAction,
  type CounselorActionState,
} from "@/app/admin/counselor/actions";
import { JalaliDateTimeFields } from "@/components/datetime/JalaliDateTimeFields";
import type { SessionWorkspaceModel } from "@/lib/counselor-os/view-models";

const initial: CounselorActionState = {};

export function SessionWorkspaceForm({ model }: { model: SessionWorkspaceModel }) {
  const [state, action, pending] = useActionState(saveSessionRecordAction, initial);

  return (
    <form action={action} className="cos-form-stack cos-session-form">
      <input type="hidden" name="sessionId" value={model.id} />

      <label>
        موضوع جلسه
        <input name="subject" defaultValue={model.subject} required />
      </label>

      <label>
        شرح جلسه
        <textarea name="body" rows={6} defaultValue={model.body} />
      </label>

      <label>
        نکات مهم
        <textarea name="keyPoints" rows={4} defaultValue={model.keyPoints} />
      </label>

      <label>
        تصمیم‌های گرفته‌شده
        <textarea name="decisions" rows={4} defaultValue={model.decisions} />
      </label>

      <label>
        کارهایی که دانش‌آموز باید انجام دهد
        <textarea name="studentActionItems" rows={3} defaultValue={model.studentActionItems} />
      </label>

      <label>
        اقدامات مشاور
        <textarea name="counselorActionItems" rows={3} defaultValue={model.counselorActionItems} />
      </label>

      <label>
        جمع‌بندی جلسه
        <textarea name="summary" rows={4} defaultValue={model.summary} />
      </label>

      <div>
        <p className="cos-sched__field-label">تاریخ پیگیری بعدی</p>
        <p className="cos-muted">ساعت پیگیری جداگانه انتخاب می‌شود.</p>
        <JalaliDateTimeFields
          id="session-next-follow"
          name="nextFollowUpAt"
          defaultValueIso={model.nextFollowUpAt}
          timeOptional
        />
      </div>

      {state.error ? <p className="cos-error">{state.error}</p> : null}
      {state.success ? <p className="cos-success">{state.success}</p> : null}

      <div className="cos-inline-actions">
        <button type="submit" className="cos-btn" disabled={pending}>
          {pending ? "در حال ذخیره…" : "ذخیره پیش‌نویس"}
        </button>
        <button
          type="submit"
          name="markCompleted"
          value="on"
          className="cos-btn cos-btn--primary"
          disabled={pending}
        >
          ثبت جلسه به‌عنوان برگزار شده
        </button>
      </div>
    </form>
  );
}
