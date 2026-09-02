"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import {
  addCounselorNoteAction,
  createFollowUpAction,
  type CounselorActionState,
} from "@/app/admin/counselor/actions";
import type { CounselorStudentCase } from "@/lib/counselor-os/students";
import type { SessionRecordView } from "@/lib/counselor-os/sessions";
import { toPersianDigits } from "@/lib/persian";

const initial: CounselorActionState = {};

type Tab = "overview" | "journey" | "sessions" | "notes" | "followups";

export function CounselorStudentCaseTabs({
  caseModel,
  sessions,
  notes,
}: {
  caseModel: CounselorStudentCase;
  sessions: SessionRecordView[];
  notes: Array<{ id: string; body: string; visibility: string; authorName: string; createdLabel: string }>;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [noteState, noteAction, notePending] = useActionState(addCounselorNoteAction, initial);
  const [followState, followAction, followPending] = useActionState(createFollowUpAction, initial);

  return (
    <div className="cos-tabs">
      <div className="cos-tabs__nav" role="tablist">
        {(
          [
            ["overview", "نمای کلی"],
            ["journey", "مسیر انتخاب رشته"],
            ["sessions", "جلسات"],
            ["notes", "یادداشت‌ها"],
            ["followups", "پیگیری"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "is-active" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="cos-tabs__panel">
        {tab === "overview" && (
          <section className="cos-panel">
            <h2>خلاصه پرونده</h2>
            <dl className="cos-dl">
              <div>
                <dt>بسته مشاوره</dt>
                <dd>
                  {caseModel.packageLabel ?? "—"}{" "}
                  {caseModel.packagePaid ? "· فعال" : "· فعال نشده"}
                </dd>
              </div>
              <div>
                <dt>آخرین جلسه</dt>
                <dd>{caseModel.lastSessionSummary ?? "هنوز جلسه‌ای ثبت نشده"}</dd>
              </div>
              <div>
                <dt>پیگیری باز</dt>
                <dd>{toPersianDigits(caseModel.pendingFollowUps)}</dd>
              </div>
            </dl>
            <h3>ترجیحات ثبت‌شده</h3>
            <ul className="cos-pref-list">
              <li>
                <strong>رشته‌ها:</strong>{" "}
                {caseModel.preferencesSummary.majors.length
                  ? caseModel.preferencesSummary.majors.join("، ")
                  : "—"}
              </li>
              <li>
                <strong>شهرها:</strong>{" "}
                {caseModel.preferencesSummary.cities.length
                  ? caseModel.preferencesSummary.cities.join("، ")
                  : "—"}
              </li>
              <li>
                <strong>اولویت:</strong>{" "}
                {caseModel.preferencesSummary.priorityFactors ?? "—"}
              </li>
            </ul>
          </section>
        )}

        {tab === "journey" && (
          <section className="cos-panel">
            <h2>مسیر انتخاب رشته</h2>
            <p className="cos-muted">اطلاعات ثبت‌شده توسط دانش‌آموز — فقط خواندنی</p>
            <ol className="cos-journey-rail">
              {caseModel.journeySteps.map((step) => (
                <li key={step.id} data-status={step.status}>
                  <span>{toPersianDigits(step.id)}</span>
                  <strong>{step.title}</strong>
                </li>
              ))}
            </ol>
          </section>
        )}

        {tab === "sessions" && (
          <section className="cos-panel">
            <h2>تاریخچه جلسات</h2>
            {sessions.length === 0 ? (
              <p className="cos-empty">هنوز جلسه مشاوره‌ای ثبت نشده است.</p>
            ) : (
              <ul className="cos-session-list">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <div>
                      <strong>{s.subject ?? "جلسه مشاوره"}</strong>
                      <span>{s.scheduledLabel ?? "—"}</span>
                    </div>
                    <p>{s.summary ?? "—"}</p>
                    <Link href={`/admin/counselor/sessions/${s.id}`}>جزئیات</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "notes" && (
          <section className="cos-panel">
            <h2>یادداشت‌ها</h2>
            <form action={noteAction} className="cos-form-stack">
              <input type="hidden" name="studentId" value={caseModel.studentId} />
              <textarea
                name="body"
                rows={4}
                placeholder="یادداشت جدید…"
                required
              />
              <div className="cos-inline-actions">
                <select name="visibility" defaultValue="GENERAL">
                  <option value="GENERAL">عمومی</option>
                  <option value="PRIVATE">خصوصی مشاور</option>
                </select>
                <button type="submit" className="cos-btn cos-btn--primary" disabled={notePending}>
                  {notePending ? "در حال ثبت…" : "ثبت یادداشت"}
                </button>
              </div>
              {noteState.error ? <p className="cos-error">{noteState.error}</p> : null}
              {noteState.success ? <p className="cos-success">{noteState.success}</p> : null}
            </form>
            <ul className="cos-note-list">
              {notes.map((n) => (
                <li key={n.id}>
                  <p>{n.body}</p>
                  <span>
                    {n.authorName} · {n.createdLabel}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tab === "followups" && (
          <section className="cos-panel">
            <h2>پیگیری‌ها</h2>
            <form action={followAction} className="cos-form-stack">
              <input type="hidden" name="studentId" value={caseModel.studentId} />
              <input name="title" placeholder="عنوان پیگیری" required />
              <textarea name="description" rows={3} placeholder="توضیح (اختیاری)" />
              <input type="datetime-local" name="dueAt" required />
              <button type="submit" className="cos-btn cos-btn--primary" disabled={followPending}>
                {followPending ? "در حال ثبت…" : "ثبت پیگیری"}
              </button>
              {followState.error ? <p className="cos-error">{followState.error}</p> : null}
              {followState.success ? <p className="cos-success">{followState.success}</p> : null}
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
