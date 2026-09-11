import { labelChoiceFeedback } from "@/lib/guidance/journey-v2/labels";
import type { ChoiceListView } from "@/lib/guidance/journey-v2/choices";
import { toPersianDigits } from "@/lib/persian";

export function ChoiceFeedbackSummary(props: {
  list: ChoiceListView | null;
  stats: {
    total: number;
    reviewed: number;
    approved: number;
    needsReview: number;
    requestedRemoval: number;
    proposedMoves?: number;
    remaining: number;
  } | null;
}) {
  if (!props.list || !props.stats) {
    return <p className="gcs-muted">بازخورد دانش‌آموز هنوز ثبت نشده است.</p>;
  }
  const notes = props.list.items.filter((i) => i.isActive && i.feedback?.note);
  return (
    <section className="gcs-feedback">
      <div className="gcs-summary">
        <article>
          <span>بررسی‌شده</span>
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
      </div>
      <ul className="gcs-feedback__notes">
        {notes.slice(0, 20).map((item) => (
          <li key={item.id}>
            <strong>
              {toPersianDigits(item.sortOrder)} · {item.officialCode || item.major}
            </strong>
            <span>{item.feedback?.verdict ? labelChoiceFeedback(item.feedback.verdict) : ""}</span>
            <p>{item.feedback?.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
