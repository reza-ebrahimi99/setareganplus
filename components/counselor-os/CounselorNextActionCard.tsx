import Link from "next/link";
import { toPersianDigits } from "@/lib/persian";
import type { NextActionCard, NextActionState } from "@/lib/guidance/journey-v2/next-action";

type Props = {
  card: NextActionCard;
  waitingDaysLabel?: string | null;
};

function stateLabel(state: NextActionState): string {
  switch (state) {
    case "ready":
      return "آماده اقدام";
    case "waiting_student":
      return "منتظر دانش‌آموز";
    case "waiting_counselor":
      return "منتظر مشاور";
    case "waiting_admin":
      return "منتظر مدیر";
    case "blocked":
      return "مسدود";
    case "overdue":
      return "عقب‌افتاده";
    case "completed":
      return "تکمیل‌شده";
    default:
      return state;
  }
}

function chipClass(status: string): string {
  if (status === "done") return "cos-next-action__chip cos-next-action__chip--done";
  if (status === "in_progress") return "cos-next-action__chip cos-next-action__chip--active";
  if (status === "needs_revision") {
    return "cos-next-action__chip cos-next-action__chip--warn";
  }
  if (status === "waiting_other") {
    return "cos-next-action__chip cos-next-action__chip--wait";
  }
  return "cos-next-action__chip";
}

export function CounselorNextActionCard({ card, waitingDaysLabel }: Props) {
  const lateProgress = card.progress11to18.filter((p) => p.step >= 11);

  return (
    <section className="cos-panel cos-next-action" aria-labelledby="cos-next-action-title">
      <div className="cos-next-action__head">
        <div>
          <h2 id="cos-next-action-title">اقدام بعدی</h2>
          <p className="cos-muted">
            مرحله {toPersianDigits(String(card.currentStep))}: {card.currentStepTitle}
          </p>
        </div>
        <span className={`cos-next-action__state cos-next-action__state--${card.state}`}>
          {stateLabel(card.state)}
        </span>
      </div>

      <p className="cos-next-action__action">{card.actionLabel}</p>
      <dl className="cos-next-action__meta">
        <div>
          <dt>مسئول</dt>
          <dd>{card.ownerLabel}</dd>
        </div>
        {card.lastCompletedStep != null ? (
          <div>
            <dt>آخرین تکمیل</dt>
            <dd>مرحله {toPersianDigits(String(card.lastCompletedStep))}</dd>
          </div>
        ) : null}
        {waitingDaysLabel ? (
          <div>
            <dt>مدت انتظار</dt>
            <dd>{waitingDaysLabel}</dd>
          </div>
        ) : null}
        {card.dueLabel ? (
          <div>
            <dt>موعد</dt>
            <dd>{card.dueLabel}</dd>
          </div>
        ) : null}
      </dl>

      {card.blockerReason ? (
        <p className="cos-alert cos-alert--warn" role="status">
          <strong>علت توقف: </strong>
          {card.blockerReason}
        </p>
      ) : null}

      <div className="cos-next-action__chips" aria-label="پیشرفت مراحل ۱۱ تا ۱۸">
        {lateProgress.map((chip) => (
          <span key={chip.step} className={chipClass(chip.status)} title={chip.shortTitle}>
            {toPersianDigits(String(chip.step))}
          </span>
        ))}
      </div>

      {card.state !== "completed" ? (
        <Link href={card.href} className="cos-btn cos-btn--primary cos-next-action__cta">
          انجام اقدام
        </Link>
      ) : null}
    </section>
  );
}
