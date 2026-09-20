"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import {
  correctKonkurFieldAction,
  reopenConfirmedListAction,
  verifySanjeshAction,
  type CounselorLateState,
} from "@/app/admin/counselor/late-actions";
import { ChoiceStudio } from "@/components/guidance/choice-studio/ChoiceStudio";
import type { Steps1118WorkspaceModel } from "@/lib/counselor-os/steps-11-18-workspace";
import { phaseForStep1118 } from "@/lib/counselor-os/steps-11-18-rail";
import {
  visualStateLabelFa,
  type Steps1118VisualState,
} from "@/lib/counselor-os/steps-11-18-rail";
import { toPersianDigits } from "@/lib/persian";

const lateInitial: CounselorLateState = {};

type Props = {
  model: Steps1118WorkspaceModel;
  isSupervisor: boolean;
  focusStep?: number;
};

function railButtonClass(state: Steps1118VisualState, active: boolean): string {
  const base = "cos-steps1118-rail__btn";
  const stateClass = `cos-steps1118-rail__btn--${state}`;
  return active ? `${base} ${stateClass} is-active` : `${base} ${stateClass}`;
}

export function CounselorSteps1118Workspace({ model, isSupervisor, focusStep }: Props) {
  const defaultStep =
    focusStep ?? (model.currentStep >= 11 && model.currentStep <= 18 ? model.currentStep : 11);
  const [step, setStep] = useState(defaultStep);

  const syncFromHash = useCallback(() => {
    if (typeof window === "undefined") return;
    const m = window.location.hash.match(/cos-steps1118-step-(\d+)/);
    if (m) {
      const n = Number(m[1]);
      if (n >= 11 && n <= 18) setStep(n);
    }
  }, []);

  useEffect(() => {
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [syncFromHash]);

  const selectStep = (n: number) => {
    setStep(n);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#cos-steps1118-step-${n}`);
    }
  };

  const railItem = model.rail.find((r) => r.step === step);
  const studioPhase = phaseForStep1118(step);
  const studioBundle = studioPhase ? model.choiceStudios[studioPhase] : null;

  const caseHref = `/admin/counselor/students/${model.studentId}`;
  const choicesHref = `${caseHref}/choices`;

  const [konkurState, konkurAction, konkurPending] = useActionState(
    correctKonkurFieldAction,
    lateInitial,
  );
  const [sanjeshState, sanjeshAction, sanjeshPending] = useActionState(
    verifySanjeshAction,
    lateInitial,
  );
  const [reopenState, reopenAction, reopenPending] = useActionState(
    reopenConfirmedListAction,
    lateInitial,
  );

  const sessionChecklist = useMemo(
    () => [
      { label: "رزرو نوبت", done: Boolean(model.late.firstSession.whenLabel) },
      { label: "تأیید زمان", done: model.late.firstSession.statusLabel !== "رزرو نشده" },
      { label: "ثبت حضور / برگزاری", done: model.late.firstSession.statusLabel.includes("برگزار") },
      { label: "خلاصه جلسه", done: Boolean(model.firstSessionRecordId) },
    ],
    [model.late.firstSession, model.firstSessionRecordId],
  );

  return (
    <section className="cos-panel cos-steps1118" id="cos-steps1118">
      <header className="cos-steps1118__head">
        <div>
          <p className="cos-page__eyebrow">Workspace عملیاتی</p>
          <h2>مراحل ۱۱ تا ۱۸ — انتخاب رشته</h2>
          <p className="cos-muted">
            {model.planPublicId
              ? `پرونده V2 · مرحله جاری ${toPersianDigits(String(model.currentStep))}`
              : "مسیر V2 برای این دانش‌آموز هنوز فعال نشده؛ rail و فرم‌ها برای راهنمایی نمایش داده می‌شوند."}
          </p>
        </div>
        <Link href={choicesHref} className="cos-btn cos-btn--ghost">
          استودیوی چیدمان (تمام‌صفحه)
        </Link>
      </header>

      <nav className="cos-steps1118-rail" aria-label="پیشرفت مراحل ۱۱ تا ۱۸">
        {model.rail.map((item) => (
          <button
            key={item.step}
            type="button"
            className={railButtonClass(item.visualState, step === item.step)}
            onClick={() => selectStep(item.step)}
            aria-current={step === item.step ? "step" : undefined}
            title={visualStateLabelFa(item.visualState)}
          >
            <span className="cos-steps1118-rail__num">{toPersianDigits(String(item.step))}</span>
            <span className="cos-steps1118-rail__title">{item.title}</span>
            <span className="cos-steps1118-rail__state">{visualStateLabelFa(item.visualState)}</span>
          </button>
        ))}
      </nav>

      <div className="cos-steps1118__step-head" id={`cos-steps1118-step-${step}`}>
        <h3>
          {railItem?.title ?? `مرحله ${toPersianDigits(String(step))}`}
        </h3>
        <p className="cos-muted">
          {railItem?.statusLabel} · مسئول: {railItem?.ownerLabel}
        </p>
      </div>

      <div className="cos-steps1118__body">
        {step === 11 ? (
          <article className="cos-steps1118-card">
            <h4>جلسه اول</h4>
            <dl className="cos-dl cos-dl--grid">
              <div>
                <dt>وضعیت رزرو</dt>
                <dd>{model.late.firstSession.statusLabel}</dd>
              </div>
              <div>
                <dt>تاریخ و ساعت</dt>
                <dd>{model.late.firstSession.whenLabel ?? "—"}</dd>
              </div>
              <div>
                <dt>وضعیت حضور</dt>
                <dd>{model.late.firstSession.statusLabel}</dd>
              </div>
            </dl>
            <h5>چک‌لیست آمادگی</h5>
            <ul className="cos-checklist">
              {sessionChecklist.map((row) => (
                <li key={row.label} data-done={row.done ? "1" : "0"}>
                  {row.label}
                </li>
              ))}
            </ul>
            <div className="cos-inline-actions">
              {model.firstSessionRecordId ? (
                <Link
                  href={`/admin/counselor/sessions/${model.firstSessionRecordId}`}
                  className="cos-btn cos-btn--primary"
                >
                  تکمیل / ثبت خلاصه جلسه
                </Link>
              ) : (
                <p className="cos-muted">پس از رزرو، رکورد جلسه برای ثبت خلاصه ایجاد می‌شود.</p>
              )}
            </div>
          </article>
        ) : null}

        {step === 12 ? (
          <article className="cos-steps1118-card" id="konkur">
            <h4>نتایج کنکور</h4>
            {model.late.konkur?.studentData ? (
              <p className="cos-success">ثبت دانش‌آموز موجود است — بررسی و تأیید مشاور.</p>
            ) : (
              <p className="cos-muted">دانش‌آموز هنوز نتیجه را ثبت نکرده.</p>
            )}
            {model.late.konkur?.groups?.length ? (
              model.late.konkur.groups.map((group) => (
                <div key={group.examGroup} className="cos-konkur-group">
                  <h5>{group.title}</h5>
                  <ul className="cos-field-mini">
                    {group.fields.map((f) => (
                      <li key={f.key}>
                        {f.label}: {f.currentValue}
                        {f.corrected ? " (اصلاح مشاور)" : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : model.late.konkur ? (
              <ul className="cos-field-mini">
                {model.late.konkur.fields.map((f) => (
                  <li key={f.key}>
                    {f.label}: {f.currentValue}
                  </li>
                ))}
              </ul>
            ) : null}
            {model.late.konkur?.document ? (
              <p>
                کارنامه: {model.late.konkur.document.filename} ·{" "}
                <a
                  href={`${caseHref}/documents/${model.late.konkur.document.id}/download`}
                >
                  دانلود
                </a>
              </p>
            ) : null}
            <form action={konkurAction} className="cos-form-stack">
              <input type="hidden" name="studentId" value={model.studentId} />
              <select name="fieldKey" required>
                <option value="examYear">سال آزمون</option>
                {(model.late.konkur?.groups ?? []).flatMap((group) =>
                  group.fields.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  )),
                )}
              </select>
              <input name="nextValue" placeholder="مقدار صحیح" required />
              <input name="reason" placeholder="دلیل اصلاح یا تأیید" />
              <button type="submit" className="cos-btn cos-btn--primary" disabled={konkurPending}>
                {konkurPending ? "در حال ثبت…" : "تأیید / درخواست اصلاح"}
              </button>
              {konkurState.error ? <p className="cos-error">{konkurState.error}</p> : null}
              {konkurState.success ? <p className="cos-success">{konkurState.success}</p> : null}
            </form>
          </article>
        ) : null}

        {step === 15 ? (
          <article className="cos-steps1118-card">
            <h4>جلسه دوم</h4>
            <dl className="cos-dl cos-dl--grid">
              <div>
                <dt>رزرو</dt>
                <dd>{model.late.secondSession.statusLabel}</dd>
              </div>
              <div>
                <dt>زمان</dt>
                <dd>{model.late.secondSession.whenLabel ?? "—"}</dd>
              </div>
              <div>
                <dt>بازخورد دانش‌آموز</dt>
                <dd>{model.late.reviewLabel}</dd>
              </div>
            </dl>
            {model.secondSessionRecordId ? (
              <Link
                href={`/admin/counselor/sessions/${model.secondSessionRecordId}`}
                className="cos-btn cos-btn--primary"
              >
                ثبت مصوبات و تکمیل جلسه دوم
              </Link>
            ) : (
              <p className="cos-muted">پس از رزرو جلسه دوم، ثبت خلاصه از اینجا در دسترس است.</p>
            )}
          </article>
        ) : null}

        {step === 17 ? (
          <article className="cos-steps1118-card">
            <h4>تأیید آگاهانه</h4>
            <p>{model.late.finalLabel}</p>
            <p className="cos-muted">
              دانش‌آموز فهرست نهایی، هشدارها و دوره‌های شهریه‌پرداز را در پورتال تأیید می‌کند.
            </p>
            <Link href={`${choicesHref}?phase=final`} className="cos-btn">
              مشاهده نسخه نهایی در استودیو
            </Link>
          </article>
        ) : null}

        {step === 18 ? (
          <article className="cos-steps1118-card" id="sanjesh">
            <h4>ثبت سنجش</h4>
            <dl className="cos-dl cos-dl--grid">
              <div>
                <dt>وضعیت</dt>
                <dd>{model.late.sanjesh?.statusLabel ?? model.late.sanjeshLabel}</dd>
              </div>
              <div>
                <dt>کد رهگیری</dt>
                <dd>{model.late.sanjesh?.reference ?? "—"}</dd>
              </div>
            </dl>
            {model.late.sanjesh?.receipt ? (
              <p>
                رسید: {model.late.sanjesh.receipt.filename} ·{" "}
                <a href={`${caseHref}/documents/${model.late.sanjesh.receipt.id}/download`}>
                  دانلود
                </a>
              </p>
            ) : null}
            <form action={sanjeshAction} className="cos-form-stack">
              <input type="hidden" name="studentId" value={model.studentId} />
              <select name="decision">
                <option value="VERIFIED">تأیید ثبت</option>
                <option value="NEEDS_FIX">نیازمند اصلاح</option>
              </select>
              <input name="note" placeholder="یادداشت بررسی" />
              <button type="submit" className="cos-btn cos-btn--primary" disabled={sanjeshPending}>
                ثبت بررسی سنجش
              </button>
              {sanjeshState.error ? <p className="cos-error">{sanjeshState.error}</p> : null}
              {sanjeshState.success ? <p className="cos-success">{sanjeshState.success}</p> : null}
            </form>
            {isSupervisor ? (
              <form action={reopenAction} className="cos-form-stack">
                <input type="hidden" name="studentId" value={model.studentId} />
                <input name="reason" placeholder="دلیل بازگشایی (اختیاری)" />
                <button type="submit" className="cos-btn" disabled={reopenPending}>
                  بازگشایی پرونده (مدیر)
                </button>
                {reopenState.error ? <p className="cos-error">{reopenState.error}</p> : null}
                {reopenState.success ? <p className="cos-success">{reopenState.success}</p> : null}
              </form>
            ) : null}
          </article>
        ) : null}

        {studioPhase && studioBundle ? (
          <div className="cos-steps1118-studio">
            <ChoiceStudio {...studioBundle} phase={studioPhase} />
          </div>
        ) : null}

        {studioPhase && !studioBundle ? (
          <p className="cos-empty cos-steps1118-empty">
            استودیوی این مرحله پس از فعال‌شدن مسیر V2 و تکمیل پیش‌نیازها در همین بخش نمایش داده می‌شود.
          </p>
        ) : null}
      </div>
    </section>
  );
}
