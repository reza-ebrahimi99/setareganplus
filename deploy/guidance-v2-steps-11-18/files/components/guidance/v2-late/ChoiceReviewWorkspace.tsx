"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  completeChoiceReviewAction,
  saveChoiceFeedbackAction,
  type LateFormState,
} from "@/app/portal/student/services/guidance/journey/steps/actions/late";
import { CHOICE_FEEDBACK_VERDICTS } from "@/lib/guidance/journey-v2/constants";
import { labelChoiceBand, labelChoiceFeedback } from "@/lib/guidance/journey-v2/labels";
import type { ChoiceListView } from "@/lib/guidance/journey-v2/choices";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/catalog";
import { toPersianDigits } from "@/lib/persian";

const initial: LateFormState = {};

export function ChoiceReviewWorkspace(props: {
  list: ChoiceListView;
  stats: {
    total: number;
    reviewed: number;
    approved: number;
    needsReview: number;
    requestedRemoval: number;
    remaining: number;
  };
  distribution: {
    byProvince: Array<{ label: string; value: number }>;
    byMajor: Array<{ label: string; value: number }>;
    byEducationType: Array<{ label: string; value: number }>;
  };
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [saveState, saveAction, savePending] = useActionState(saveChoiceFeedbackAction, initial);
  const [doneState, doneAction, donePending] = useActionState(completeChoiceReviewAction, initial);

  if (doneState.ok) router.replace(guidanceJourneyV2StepPath(15));

  const items = useMemo(() => {
    const q = query.trim();
    if (!q) return props.list.items.filter((i) => i.isActive);
    return props.list.items.filter(
      (i) =>
        i.isActive &&
        [i.major, i.university, i.city, i.province, i.officialCode ?? ""].some((v) =>
          v.includes(q),
        ),
    );
  }, [props.list.items, query]);

  return (
    <div className="gv2-review">
      <section className="gv2-stats">
        <article><span>کل انتخاب‌ها</span><strong>{toPersianDigits(props.stats.total)}</strong></article>
        <article><span>بررسی‌شده</span><strong>{toPersianDigits(props.stats.reviewed)}</strong></article>
        <article><span>مورد تأیید</span><strong>{toPersianDigits(props.stats.approved)}</strong></article>
        <article><span>نیاز به بررسی</span><strong>{toPersianDigits(props.stats.needsReview)}</strong></article>
        <article><span>درخواست حذف</span><strong>{toPersianDigits(props.stats.requestedRemoval)}</strong></article>
        <article><span>باقی‌مانده</span><strong>{toPersianDigits(props.stats.remaining)}</strong></article>
      </section>

      <section className="gv2-dist">
        <Dist title="استان / شهر" rows={props.distribution.byProvince} />
        <Dist title="رشته" rows={props.distribution.byMajor} />
        <Dist title="نوع دوره" rows={props.distribution.byEducationType} />
      </section>

      <label className="gv2-search">
        جستجو
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="رشته، دانشگاه یا شهر" />
      </label>

      {saveState.error ? <p className="gpj-banner gpj-banner--error">{saveState.error}</p> : null}
      {doneState.error ? <p className="gpj-banner gpj-banner--error">{doneState.error}</p> : null}

      <ol className="gv2-choice-cards">
        {items.map((item) => (
          <li key={item.id} className="gv2-choice-card">
            <header>
              <em>{toPersianDigits(item.sortOrder)}</em>
              <div>
                <strong>{item.major}</strong>
                <span>{item.university}</span>
              </div>
            </header>
            <p>
              {[item.city || item.province, item.educationTypeLabel, labelChoiceBand(item.band)]
                .filter((v) => v && v !== "—")
                .join(" · ")}
            </p>
            {item.notes ? <p className="gv2-muted">یادداشت مشاور: {item.notes}</p> : null}
            <form action={saveAction} className="gv2-feedback-form">
              <input type="hidden" name="listId" value={props.list.id} />
              <input type="hidden" name="itemId" value={item.id} />
              <select name="verdict" defaultValue={item.feedback?.verdict ?? ""} required>
                <option value="" disabled>
                  بازخورد
                </option>
                {CHOICE_FEEDBACK_VERDICTS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
              <input name="note" defaultValue={item.feedback?.note ?? ""} placeholder="یادداشت اختیاری" />
              <button type="submit" disabled={savePending}>
                ذخیره
              </button>
            </form>
            {item.feedback?.verdict ? (
              <small>وضعیت فعلی: {labelChoiceFeedback(item.feedback.verdict)}</small>
            ) : (
              <small>هنوز بررسی نشده</small>
            )}
          </li>
        ))}
      </ol>

      <form action={doneAction} className="gv2-sticky-complete">
        <input type="hidden" name="listId" value={props.list.id} />
        <button type="submit" className="gjv2-nav__button gjv2-nav__button--next" disabled={donePending}>
          {donePending ? "در حال ثبت…" : "بررسی من کامل شد"}
        </button>
      </form>
    </div>
  );
}

function Dist({ title, rows }: { title: string; rows: Array<{ label: string; value: number }> }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h3>{title}</h3>
      <ul>
        {rows.slice(0, 8).map((row) => (
          <li key={row.label}>
            {row.label}: {toPersianDigits(row.value)}
          </li>
        ))}
      </ul>
    </div>
  );
}
