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
import {
  CHOICE_STUDIO_BRAND,
  INITIAL_NONFINAL_DISCLAIMER,
} from "@/lib/guidance/choice-studio/types";
import { toPersianDigits } from "@/lib/persian";

const initial: LateFormState = {};

type Filter = "all" | "pending" | "approved" | "needs_review" | "remove" | "move";

export function ChoiceReviewWorkspace(props: {
  list: ChoiceListView;
  studentName?: string;
  counselorName?: string;
  readyAtLabel?: string | null;
  stats: {
    total: number;
    reviewed: number;
    approved: number;
    needsReview: number;
    requestedRemoval: number;
    proposedMoves?: number;
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
  const [filter, setFilter] = useState<Filter>("all");
  const [saveState, saveAction, savePending] = useActionState(saveChoiceFeedbackAction, initial);
  const [doneState, doneAction, donePending] = useActionState(completeChoiceReviewAction, initial);

  if (doneState.ok) router.replace(guidanceJourneyV2StepPath(15));

  const items = useMemo(() => {
    const q = query.trim();
    return props.list.items.filter((i) => {
      if (!i.isActive) return false;
      if (filter === "pending" && i.feedback?.verdict) return false;
      if (filter === "approved" && i.feedback?.verdict !== "approved") return false;
      if (filter === "needs_review" && i.feedback?.verdict !== "needs_review") return false;
      if (filter === "remove" && i.feedback?.verdict !== "remove") return false;
      if (filter === "move" && i.feedback?.verdict !== "less" && i.feedback?.verdict !== "more") {
        return false;
      }
      if (!q) return true;
      return [i.major, i.university, i.city, i.officialCode ?? ""].some((v) => v.includes(q));
    });
  }, [props.list.items, query, filter]);

  return (
    <div className="gv2-review gcs-student">
      <header className="gcs-student__hero">
        <p>{CHOICE_STUDIO_BRAND}</p>
        <h2>بررسی نسخه اولیه انتخاب رشته</h2>
        <span className="gcs-badge gcs-badge--initial_ready">نسخه اولیه — غیرنهایی</span>
        <p className="gcs-disclaimer">{INITIAL_NONFINAL_DISCLAIMER}</p>
        <p>
          {props.studentName ? `${props.studentName} · ` : ""}
          {toPersianDigits(props.stats.total)} انتخاب
          {props.readyAtLabel ? ` · ${props.readyAtLabel}` : ""}
          {props.counselorName ? ` · مشاور: ${props.counselorName}` : ""}
        </p>
      </header>

      <section className="gv2-stats">
        <article>
          <span>پیشرفت بررسی</span>
          <strong>
            {toPersianDigits(props.stats.reviewed)} از {toPersianDigits(props.stats.total)}
          </strong>
        </article>
        <article>
          <span>موافق</span>
          <strong>{toPersianDigits(props.stats.approved)}</strong>
        </article>
        <article>
          <span>نیاز به بررسی</span>
          <strong>{toPersianDigits(props.stats.needsReview)}</strong>
        </article>
        <article>
          <span>حذف پیشنهادی</span>
          <strong>{toPersianDigits(props.stats.requestedRemoval)}</strong>
        </article>
        <article>
          <span>جابه‌جایی پیشنهادی</span>
          <strong>{toPersianDigits(props.stats.proposedMoves ?? 0)}</strong>
        </article>
        <article>
          <span>باقی‌مانده</span>
          <strong>{toPersianDigits(props.stats.remaining)}</strong>
        </article>
      </section>

      <p className="gv2-muted">
        بازخورد شما مشورتی است و ترتیب مشاور را تغییر نمی‌دهد. مشاور در جلسه دوم آن را بررسی می‌کند.
      </p>

      <div className="gcs-student__filters">
        {(
          [
            ["all", "همه"],
            ["pending", "بررسی‌نشده"],
            ["approved", "موافق"],
            ["needs_review", "نیازمند بررسی"],
            ["remove", "حذف پیشنهادی"],
            ["move", "جابه‌جایی پیشنهادی"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={filter === id ? "is-active" : ""}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="gv2-search">
        جستجو
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="رشته، دانشگاه یا کد" />
      </label>

      {saveState.error ? <p className="gpj-banner gpj-banner--error">{saveState.error}</p> : null}
      {doneState.error ? <p className="gpj-banner gpj-banner--error">{doneState.error}</p> : null}

      <ol className="gv2-choice-cards">
        {items.map((item) => (
          <li key={item.id} className="gv2-choice-card">
            <header>
              <em>{toPersianDigits(item.sortOrder)}</em>
              <div>
                <strong>{item.officialCode || "—"}</strong>
                <span>
                  {item.major} · {item.university}
                </span>
              </div>
            </header>
            <p>
              {[item.city || item.province, item.educationTypeLabel, labelChoiceBand(item.band)]
                .filter((v) => v && v !== "—")
                .join(" · ")}
            </p>
            {item.rationale || item.notes ? (
              <p className="gv2-muted">یادداشت مشاور: {item.rationale || item.notes}</p>
            ) : null}
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
                ذخیره نظر
              </button>
            </form>
            <small>
              {item.feedback?.verdict
                ? `وضعیت فعلی: ${labelChoiceFeedback(item.feedback.verdict)}`
                : "هنوز بررسی نشده"}
            </small>
          </li>
        ))}
      </ol>

      <form action={doneAction} className="gv2-sticky-complete">
        <input type="hidden" name="listId" value={props.list.id} />
        <button type="submit" className="gjv2-nav__button gjv2-nav__button--next" disabled={donePending}>
          {donePending ? "در حال ارسال…" : "ارسال نظرها برای مشاور"}
        </button>
      </form>
    </div>
  );
}
