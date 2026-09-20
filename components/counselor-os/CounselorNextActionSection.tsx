import Link from "next/link";
import { CounselorNextActionCard } from "@/components/counselor-os/CounselorNextActionCard";
import type { CounselorNextActionView } from "@/lib/counselor-os/steps-11-18-workspace";
import { toPersianDigits } from "@/lib/persian";

type Props = {
  view: CounselorNextActionView;
  waitingDaysLabel?: string | null;
};

export function CounselorNextActionSection({ view, waitingDaysLabel }: Props) {
  if (view.kind === "card") {
    return (
      <CounselorNextActionCard card={view.card} waitingDaysLabel={waitingDaysLabel} />
    );
  }

  return (
    <section className="cos-panel cos-next-action cos-next-action--incomplete" aria-labelledby="cos-next-action-title">
      <div className="cos-next-action__head">
        <div>
          <h2 id="cos-next-action-title">اقدام بعدی</h2>
          <p className="cos-muted">وضعیت عملیاتی مراحل ۱۱–۱۸</p>
        </div>
        <span className="cos-next-action__state cos-next-action__state--blocked">نیازمند تکمیل</span>
      </div>
      <p className="cos-next-action__action">{view.message}</p>
      <dl className="cos-next-action__meta">
        <div>
          <dt>مسئول</dt>
          <dd>مشاور / ناظر</dd>
        </div>
        {waitingDaysLabel ? (
          <div>
            <dt>مدت انتظار</dt>
            <dd>{waitingDaysLabel}</dd>
          </div>
        ) : null}
      </dl>
      <Link href="#cos-steps1118" className="cos-btn cos-btn--primary cos-next-action__cta">
        مشاهده workspace مراحل ۱۱–۱۸
      </Link>
    </section>
  );
}

export function formatWaitingDaysLabel(days: number): string {
  if (days <= 0) return "امروز / بدون تأخیر";
  return `${toPersianDigits(String(days))} روز`;
}
