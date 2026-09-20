"use client";

import { useActionState } from "react";
import {
  counselorJourneyReplaceFinalGradesAction,
  type CounselorJourneyStepActionState,
} from "@/app/admin/counselor/counselor-journey-step-actions";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

const initial: CounselorJourneyStepActionState = {};

export function CounselorJourneyStep3GradesPanel(props: {
  studentId: string;
  document: {
    id: string;
    filename: string;
    versionNumber: number;
    verificationLabel: string;
    createdAtIso: string | null;
    downloadHref: string;
  } | null;
}) {
  const [state, action, pending] = useActionState(
    counselorJourneyReplaceFinalGradesAction,
    initial,
  );

  return (
    <section className="cos-panel cos-journey-step3" dir="rtl">
      <h2>کارنامه / نمرات نهایی</h2>
      <p className="cos-muted">
        فایل قبلی حذف نمی‌شود؛ نسخه جدید به‌عنوان latest ثبت می‌شود و نسخه‌های قبلی در
        تاریخچه مدارک باقی می‌مانند.
      </p>

      {props.document ? (
        <dl className="cos-dl cos-dl--grid">
          <div>
            <dt>فایل فعلی</dt>
            <dd>
              <a href={props.document.downloadHref}>{props.document.filename}</a>
            </dd>
          </div>
          <div>
            <dt>نسخه</dt>
            <dd>{toPersianDigits(props.document.versionNumber)}</dd>
          </div>
          <div>
            <dt>وضعیت تأیید</dt>
            <dd>{props.document.verificationLabel}</dd>
          </div>
          {props.document.createdAtIso ? (
            <div>
              <dt>آپلود</dt>
              <dd>{formatJalaliDateTimeShort(new Date(props.document.createdAtIso))}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="cos-muted">هنوز کارنامه‌ای ثبت نشده است.</p>
      )}

      {state.error ? (
        <p className="cos-alert cos-alert--error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="cos-alert cos-alert--success">فایل با موفقیت جایگزین شد.</p>
      ) : null}

      <form action={action} className="cos-form-stack" encType="multipart/form-data">
        <input type="hidden" name="studentId" value={props.studentId} />
        <label>
          فایل جدید (PDF یا تصویر)
          <input type="file" name="file" accept=".pdf,image/*" required />
        </label>
        <label>
          دلیل جایگزینی (الزامی)
          <textarea name="reason" rows={2} required minLength={3} />
        </label>
        <button type="submit" className="cos-btn cos-btn--primary" disabled={pending}>
          {pending ? "در حال آپلود…" : "جایگزینی کارنامه"}
        </button>
      </form>
    </section>
  );
}
