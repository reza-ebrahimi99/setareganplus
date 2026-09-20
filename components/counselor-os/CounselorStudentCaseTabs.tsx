"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useActionState } from "react";
import {
  addCounselorNoteAction,
  assignStudentFromCaseAction,
  correctStudentFieldAction,
  createFollowUpAction,
  verifyGuidanceDocumentFormAction,
  type CounselorActionState,
} from "@/app/admin/counselor/actions";
import { CounselorHollandPanel } from "@/components/counselor-os/CounselorHollandPanel";
import { CounselorSteps1118Workspace } from "@/components/counselor-os/CounselorSteps1118Workspace";
import type { Steps1118WorkspaceModel } from "@/lib/counselor-os/steps-11-18-workspace";
import { JalaliDateTimeFields } from "@/components/datetime/JalaliDateTimeFields";
import {
  COUNSELOR_EDITABLE_PERSONAL_FIELDS,
  labelFollowUpPriority,
  labelJourneyStatus,
} from "@/lib/counselor-os/labels";
import type {
  CounselorCorrectionView,
  CounselorStudentCase,
  CounselorV2Dossier,
  SessionRecordView,
} from "@/lib/counselor-os/view-models";
import {
  buildCounselorCaseNavItems,
  type CounselorCaseNavTabId,
} from "@/lib/counselor-os/case-page-config";
import { toPersianDigits } from "@/lib/persian";

const initial: CounselorActionState = {};

export function CounselorStudentCaseTabs({
  caseModel,
  dossier,
  sessions,
  notes,
  corrections,
  followUps,
  isSupervisor,
  counselors,
  steps1118,
  defaultTab = "overview",
}: {
  caseModel: CounselorStudentCase;
  dossier: CounselorV2Dossier;
  sessions: SessionRecordView[];
  notes: Array<{ id: string; body: string; visibility: string; authorName: string; createdLabel: string }>;
  corrections: CounselorCorrectionView[];
  followUps: Array<{
    id: string;
    title: string;
    dueLabel: string;
    priority: string;
    status: string;
  }>;
  isSupervisor: boolean;
  counselors: Array<{ userId: string; name: string }>;
  steps1118: Steps1118WorkspaceModel;
  defaultTab?: CounselorCaseNavTabId;
}) {
  const navId = useId();
  const [tab, setTab] = useState<CounselorCaseNavTabId>(defaultTab);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [noteState, noteAction, notePending] = useActionState(addCounselorNoteAction, initial);
  const [followState, followAction, followPending] = useActionState(createFollowUpAction, initial);
  const [editState, editAction, editPending] = useActionState(correctStudentFieldAction, initial);
  const [assignState, assignAction, assignPending] = useActionState(assignStudentFromCaseAction, initial);

  const navItems = buildCounselorCaseNavItems({
    hasPersonal: Object.keys(dossier.personal).length > 0,
    hasPreferences: Boolean(
      dossier.majors.length || dossier.provinces.length || dossier.educationTypes.length,
    ),
    hasGrades: dossier.grades.length > 0,
    hasDocuments: dossier.documents.length > 0,
    hasSessions: sessions.length > 0,
  });

  function selectTab(id: CounselorCaseNavTabId) {
    setTab(id);
    setMobileNavOpen(false);
  }

  const exportBase = `/admin/counselor/students/${caseModel.studentId}/export`;

  return (
    <div className="cos-case-layout">
      <button
        type="button"
        className="cos-case-nav-toggle cos-btn cos-btn--ghost"
        aria-expanded={mobileNavOpen}
        aria-controls={`${navId}-nav`}
        onClick={() => setMobileNavOpen((open) => !open)}
      >
        {mobileNavOpen ? "بستن منوی پرونده" : "منوی بخش‌های پرونده"}
      </button>

      <aside
        id={`${navId}-nav`}
        className={`cos-case-sidebar${mobileNavOpen ? " is-open" : ""}`}
        aria-label="ناوبری اطلاعات پرونده"
      >
        <p className="cos-case-sidebar__title">اطلاعات پرونده</p>
        <nav role="tablist" aria-orientation="vertical" className="cos-case-sidebar__nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${navId}-tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`${navId}-panel-${item.id}`}
              className={tab === item.id ? "is-active" : undefined}
              onClick={() => selectTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {mobileNavOpen ? (
        <button
          type="button"
          className="cos-case-sidebar-backdrop"
          aria-label="بستن منو"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <div
        className="cos-case-main cos-tabs__panel"
        role="tabpanel"
        id={`${navId}-panel-${tab}`}
        aria-labelledby={`${navId}-tab-${tab}`}
      >
        {tab === "overview" && (
          <section className="cos-panel">
            <h2>خلاصه عملیاتی</h2>
            <div className="cos-summary-cards">
              <article className="cos-summary-card">
                <span>وضعیت دانش‌آموز</span>
                <strong>{caseModel.studentStatusLabel}</strong>
              </article>
              <article className="cos-summary-card">
                <span>تاریخ ثبت</span>
                <strong>{caseModel.registeredLabel}</strong>
              </article>
              <article className="cos-summary-card">
                <span>آخرین فعالیت</span>
                <strong>{caseModel.lastActivityLabel ?? "—"}</strong>
              </article>
              <article className="cos-summary-card">
                <span>مرحله جاری</span>
                <strong>{caseModel.currentStepTitle ?? "هنوز شروع نشده"}</strong>
              </article>
              <article className="cos-summary-card">
                <span>آخرین مرحله تکمیل‌شده</span>
                <strong>{caseModel.lastCompletedStepTitle ?? "—"}</strong>
              </article>
              <article className="cos-summary-card">
                <span>پیشرفت</span>
                <strong>{toPersianDigits(caseModel.completionPercentage)}٪</strong>
              </article>
            </div>
            <dl className="cos-dl cos-dl--grid cos-summary-dl">
              <div>
                <dt>بسته</dt>
                <dd>
                  {dossier.finance.packageTitle} · {dossier.finance.packageStateLabel}
                </dd>
              </div>
              <div>
                <dt>مشاور پرونده</dt>
                <dd>
                  {caseModel.assignedCounselor
                    ? `${caseModel.assignedCounselor.name} · ${caseModel.assignedCounselor.assignedAtLabel}`
                    : "تخصیص نشده"}
                </dd>
              </div>
              {caseModel.assignedCounselor?.previousCounselorName ? (
                <div>
                  <dt>مشاور قبلی</dt>
                  <dd>{caseModel.assignedCounselor.previousCounselorName}</dd>
                </div>
              ) : null}
            </dl>
            {isSupervisor ? (
              <form action={assignAction} className="cos-form-stack cos-edit-box cos-assign-form">
                <h3>تخصیص / انتقال مشاور</h3>
                <input type="hidden" name="studentId" value={caseModel.studentId} />
                <label>
                  مشاور
                  <select name="counselorUserId" required defaultValue={caseModel.assignedCounselor?.userId ?? ""}>
                    <option value="" disabled>
                      انتخاب مشاور
                    </option>
                    {counselors.map((c) => (
                      <option key={c.userId} value={c.userId}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="cos-check">
                  <input type="checkbox" name="overrideCapacity" value="1" />
                  <span>تأیید صریح مدیر برای عبور از ظرفیت</span>
                </label>
                <button type="submit" className="cos-btn cos-btn--primary cos-assign-form__submit" disabled={assignPending}>
                  {assignPending ? "در حال ثبت…" : "ثبت تخصیص"}
                </button>
                {assignState.error ? <p className="cos-error">{assignState.error}</p> : null}
                {assignState.success ? <p className="cos-success">{assignState.success}</p> : null}
              </form>
            ) : null}
            <div className="cos-export-group">
              <h3 className="cos-export-group__title">خروجی‌های PDF</h3>
              <div className="cos-inline-actions cos-export-group__actions">
                <Link href={`${exportBase}/case`} className="cos-btn cos-btn--primary">
                  دانلود پرونده کامل PDF
                </Link>
                <Link href={`${exportBase}/holland`} className="cos-btn">
                  دانلود گزارش رغبت‌سنجی PDF
                </Link>
                <Link href={`${exportBase}/worksheet`} className="cos-btn">
                  دانلود برگه کار انتخاب رشته PDF
                </Link>
              </div>
            </div>
          </section>
        )}

        {tab === "journey" && (
          <section className="cos-panel">
            <h2>مسیر ۱۸ مرحله‌ای انتخاب رشته</h2>
            <p className="cos-muted">نمایش اصلی همیشه مسیر V2 است؛ کدهای داخلی نمایش داده نمی‌شوند.</p>
            <ol className="cos-journey-rail">
              {dossier.steps.map((step) => (
                <li key={step.id} data-status={step.status === "current" ? "active" : step.status}>
                  <span>{toPersianDigits(step.id)}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <em>{labelJourneyStatus(step.status)}</em>
                    {step.completedAtLabel ? <small>{step.completedAtLabel}</small> : null}
                    {step.fields.length > 0 ? (
                      <ul className="cos-field-mini">
                        {step.fields.slice(0, 6).map((field) => (
                          <li key={field.label}>
                            {field.label}: {field.value}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {tab === "late" ? (
          <CounselorSteps1118Workspace model={steps1118} isSupervisor={isSupervisor} />
        ) : null}

        {tab === "academic" && (
          <section className="cos-panel">
            <h2>اطلاعات تحصیلی و هویتی ثبت‌شده</h2>
            <dl className="cos-dl cos-dl--grid">
              {Object.entries(dossier.personal).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value || "—"}</dd>
                </div>
              ))}
            </dl>
            {caseModel.planPublicId ? (
              <form action={editAction} className="cos-form-stack cos-edit-box">
                <h3>اصلاح مشاور</h3>
                <input type="hidden" name="studentId" value={caseModel.studentId} />
                <select name="fieldKey" required defaultValue="highSchoolAverage">
                  {Object.entries(COUNSELOR_EDITABLE_PERSONAL_FIELDS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <input name="nextValue" placeholder="مقدار صحیح" required />
                <input name="reason" placeholder="دلیل اصلاح (اختیاری)" />
                <button type="submit" className="cos-btn cos-btn--primary" disabled={editPending}>
                  {editPending ? "در حال ثبت…" : "ثبت اصلاح"}
                </button>
                {editState.error ? <p className="cos-error">{editState.error}</p> : null}
                {editState.success ? <p className="cos-success">{editState.success}</p> : null}
              </form>
            ) : (
              <p className="cos-muted">تا وقتی مسیر انتخاب رشته ساخته نشده، ویرایش داده‌های گام ممکن نیست.</p>
            )}
          </section>
        )}

        {tab === "holland" && (
          <CounselorHollandPanel
            studentId={caseModel.studentId}
            holland={dossier.holland}
            finance={dossier.finance}
          />
        )}

        {tab === "preferences" && (
          <section className="cos-panel">
            <h2>ترجیحات و اولویت‌ها</h2>
            <ul className="cos-pref-list">
              <li>
                <strong>دوره‌ها:</strong> {dossier.educationTypes.join("، ") || "—"}
              </li>
              <li>
                <strong>استان‌ها / شهرها:</strong> {dossier.provinces.join("، ") || "—"}
              </li>
              <li>
                <strong>رشته‌ها:</strong> {dossier.majors.join("، ") || "—"}
              </li>
              <li>
                <strong>معیارها:</strong> {dossier.priorities.join(" > ") || "—"}
              </li>
            </ul>
          </section>
        )}

        {tab === "grades" && (
          <section className="cos-panel">
            <h2>نمرات</h2>
            <table className="cos-table">
              <tbody>
                {dossier.grades.map((row) => (
                  <tr key={row.label}>
                    <th>{row.label}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {tab === "documents" && (
          <section className="cos-panel">
            <h2>مدارک و نتایج</h2>
            <ul className="cos-doc-list">
              {dossier.documents.map((doc) => (
                <li key={doc.id} className="cos-doc-list__item">
                  <div>
                    <strong>{doc.title}</strong>
                    <span>
                      {doc.filename} · {doc.uploadedLabel} · {doc.verification}
                    </span>
                    {doc.verifiedBy ? (
                      <span>
                        بررسی‌کننده: {doc.verifiedBy}
                        {doc.verifiedLabel ? ` · ${doc.verifiedLabel}` : ""}
                      </span>
                    ) : null}
                    {doc.reviewNote ? <span>یادداشت مشاور: {doc.reviewNote}</span> : null}
                  </div>
                  <div className="cos-doc-list__actions">
                    <a
                      className="cos-btn cos-btn--ghost"
                      href={`/admin/counselor/students/${caseModel.studentId}/documents/${doc.id}/download`}
                    >
                      مشاهده / دانلود
                    </a>
                    {dossier.planId ? (
                      <form action={verifyGuidanceDocumentFormAction} className="cos-doc-verify">
                        <input type="hidden" name="studentId" value={caseModel.studentId} />
                        <input type="hidden" name="planId" value={dossier.planId} />
                        <input type="hidden" name="documentId" value={doc.id} />
                        <label>
                          یادداشت مشاور
                          <input name="note" defaultValue={doc.reviewNote ?? ""} />
                        </label>
                        <button
                          className="cos-btn cos-btn--primary"
                          name="decision"
                          value="VERIFIED"
                          type="submit"
                        >
                          تأیید
                        </button>
                        <button
                          className="cos-btn"
                          name="decision"
                          value="REJECTED"
                          type="submit"
                        >
                          نیازمند اصلاح
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tab === "finance" && (
          <section className="cos-panel">
            <h2>وضعیت مالی</h2>
            <div className="cos-finance-grid">
              {dossier.finance.items.map((item) => (
                <article key={item.kind} className="cos-finance-card">
                  <span>{item.kind === "holland" ? "رغبت‌سنجی" : "انتخاب رشته"}</span>
                  <strong>{item.title}</strong>
                  <p>{item.amountLabel}</p>
                  <p>{item.statusLabel}</p>
                  <p>{item.activationLabel}</p>
                  {item.paidAtLabel ? <p>{item.paidAtLabel}</p> : null}
                  {item.tracking ? <small>شناسه: {item.tracking}</small> : null}
                  {item.discountLabel ? <small>تخفیف: {item.discountLabel}</small> : null}
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "sessions" && (
          <section className="cos-panel">
            <h2>جلسات</h2>
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
          </section>
        )}

        {tab === "notes" && (
          <section className="cos-panel">
            <h2>یادداشت‌ها</h2>
            <form action={noteAction} className="cos-form-stack">
              <input type="hidden" name="studentId" value={caseModel.studentId} />
              <textarea name="body" rows={4} placeholder="یادداشت جدید…" required />
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
              <div className="cos-follow-due">
                <p className="cos-sched__field-label">تاریخ پیگیری</p>
                <p className="cos-muted">ساعت پیگیری را جداگانه انتخاب کنید. ذخیره به‌صورت میلادی/UTC است.</p>
                <JalaliDateTimeFields id="case-follow-due" name="dueAt" />
              </div>
              <button type="submit" className="cos-btn cos-btn--primary" disabled={followPending}>
                {followPending ? "در حال ثبت…" : "ثبت پیگیری"}
              </button>
              {followState.error ? <p className="cos-error">{followState.error}</p> : null}
              {followState.success ? <p className="cos-success">{followState.success}</p> : null}
            </form>
            <ul className="cos-follow-list">
              {followUps.map((f) => (
                <li key={f.id}>
                  <strong>{f.title}</strong>
                  <span>
                    {f.dueLabel} · {labelFollowUpPriority(f.priority)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tab === "corrections" && (
          <section className="cos-panel">
            <h2>تاریخچه اصلاحات</h2>
            {corrections.length === 0 ? (
              <p className="cos-empty">هنوز اصلاحی توسط مشاور ثبت نشده است.</p>
            ) : (
              <ul className="cos-audit-list">
                {corrections.map((row) => (
                  <li key={row.id}>
                    <strong>{row.fieldLabel}</strong>
                    <p>
                      از «{row.previousValue}» به «{row.newValue}»
                    </p>
                    <span>
                      {row.actorName} · {row.createdLabel}
                      {row.reason ? ` · ${row.reason}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
