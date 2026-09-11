"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  correctKonkurFieldAction,
  reopenConfirmedListAction,
  verifySanjeshAction,
  type CounselorLateState,
} from "@/app/admin/counselor/late-actions";
import type { CounselorLateJourneyModel } from "@/lib/counselor-os/late-journey";
import { toPersianDigits } from "@/lib/persian";

const initial: CounselorLateState = {};

export function CounselorLateJourneyPanel(props: {
  model: CounselorLateJourneyModel;
  isSupervisor: boolean;
}) {
  const [konkurState, konkurAction, konkurPending] = useActionState(
    correctKonkurFieldAction,
    initial,
  );
  const [sanjeshState, sanjeshAction, sanjeshPending] = useActionState(
    verifySanjeshAction,
    initial,
  );
  const [reopenState, reopenAction, reopenPending] = useActionState(
    reopenConfirmedListAction,
    initial,
  );

  return (
    <section className="cos-panel" id="late-journey">
      <h2>عملیات مراحل ۱۱ تا ۱۸</h2>
      <ol className="cos-late-rail">
        {props.model.steps.map((step) => (
          <li key={step.id} data-need={step.needsCounselor ? "1" : "0"}>
            <span>{toPersianDigits(step.id)}</span>
            <div>
              <strong>{step.title}</strong>
              <em>{step.statusLabel}</em>
              <small>{step.detail}</small>
              {step.cta ? (
                <Link href={step.cta.href} className="cos-btn cos-btn--ghost">
                  {step.cta.label}
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="cos-late-grid" id="konkur">
        <article>
          <h3>نتایج کنکور</h3>
          {props.model.konkur?.groups?.length ? (
            props.model.konkur.groups.map((group) => (
              <div key={group.examGroup} className="cos-konkur-group">
                <h4>{group.title}</h4>
                <ul className="cos-field-mini">
                  {group.fields.map((f) => (
                    <li key={f.key}>
                      {f.label}: {f.currentValue}
                      {f.corrected ? " (اصلاح‌شده)" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : props.model.konkur ? (
            <ul className="cos-field-mini">
              {props.model.konkur.fields.map((f) => (
                <li key={f.key}>
                  {f.label}: {f.currentValue}
                  {f.corrected ? " (اصلاح‌شده)" : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="cos-muted">هنوز ثبت نشده.</p>
          )}
          {props.model.konkur?.document ? (
            <p>
              کارنامه: {props.model.konkur.document.filename} ·{" "}
              <a
                href={`/admin/counselor/students/${props.model.studentId}/documents/${props.model.konkur.document.id}/download`}
              >
                دانلود
              </a>
            </p>
          ) : null}
          <form action={konkurAction} className="cos-form-stack">
            <input type="hidden" name="studentId" value={props.model.studentId} />
            <select name="fieldKey" required>
              <option value="examYear">سال آزمون</option>
              {(props.model.konkur?.groups ?? []).flatMap((group) =>
                group.fields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                )),
              )}
            </select>
            <input name="nextValue" placeholder="مقدار صحیح" required />
            <input name="reason" placeholder="دلیل اصلاح" />
            <button type="submit" className="cos-btn cos-btn--primary" disabled={konkurPending}>
              ثبت اصلاح با سابقه
            </button>
            {konkurState.error ? <p className="cos-error">{konkurState.error}</p> : null}
            {konkurState.success ? <p className="cos-success">{konkurState.success}</p> : null}
          </form>
        </article>

        <article id="sanjesh">
          <h3>ثبت سنجش</h3>
          <p>{props.model.sanjesh?.statusLabel ?? "ثبت نشده"}</p>
          <p>شناسه: {props.model.sanjesh?.reference ?? "—"}</p>
          {props.model.sanjesh?.receipt ? (
            <p>
              رسید: {props.model.sanjesh.receipt.filename} ·{" "}
              <a
                href={`/admin/counselor/students/${props.model.studentId}/documents/${props.model.sanjesh.receipt.id}/download`}
              >
                دانلود
              </a>
            </p>
          ) : null}
          <form action={sanjeshAction} className="cos-form-stack">
            <input type="hidden" name="studentId" value={props.model.studentId} />
            <select name="decision">
              <option value="VERIFIED">تأیید شده</option>
              <option value="NEEDS_FIX">نیازمند اصلاح</option>
            </select>
            <input name="note" placeholder="یادداشت بررسی" />
            <button type="submit" className="cos-btn cos-btn--primary" disabled={sanjeshPending}>
              بررسی رسید سنجش
            </button>
            {sanjeshState.error ? <p className="cos-error">{sanjeshState.error}</p> : null}
            {sanjeshState.success ? <p className="cos-success">{sanjeshState.success}</p> : null}
          </form>
        </article>
      </div>

      {props.isSupervisor ? (
        <form action={reopenAction} className="cos-form-stack">
          <input type="hidden" name="studentId" value={props.model.studentId} />
          <button type="submit" className="cos-btn" disabled={reopenPending}>
            بازگشایی فهرست تأییدشده (ناظر)
          </button>
          {reopenState.error ? <p className="cos-error">{reopenState.error}</p> : null}
          {reopenState.success ? <p className="cos-success">{reopenState.success}</p> : null}
        </form>
      ) : null}
    </section>
  );
}
