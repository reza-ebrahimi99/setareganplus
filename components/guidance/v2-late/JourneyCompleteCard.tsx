import Link from "next/link";
import { toPersianDigits } from "@/lib/persian";

export function JourneyCompleteCard(props: {
  counselorName: string;
  packageCode: string;
  firstSession: string;
  secondSession: string;
  finalChoiceCount: number;
  confirmedAtLabel: string;
  sanjeshStatusLabel: string;
  dashboardHref: string;
}) {
  return (
    <div className="gv2-complete">
      <p className="gv2-status-card__eyebrow">مسیر انتخاب رشته</p>
      <h2>مسیر ۱۸ مرحله‌ای شما کامل شد</h2>
      <p>پیشرفت پرونده: {toPersianDigits(100)}٪</p>
      <dl className="gv2-dl gv2-dl--grid">
        <div>
          <dt>مشاور</dt>
          <dd>{props.counselorName}</dd>
        </div>
        <div>
          <dt>بسته</dt>
          <dd>{props.packageCode}</dd>
        </div>
        <div>
          <dt>جلسه اول</dt>
          <dd>{props.firstSession}</dd>
        </div>
        <div>
          <dt>جلسه دوم</dt>
          <dd>{props.secondSession}</dd>
        </div>
        <div>
          <dt>تعداد انتخاب نهایی</dt>
          <dd>{toPersianDigits(props.finalChoiceCount)}</dd>
        </div>
        <div>
          <dt>تاریخ تأیید آگاهانه</dt>
          <dd>{props.confirmedAtLabel}</dd>
        </div>
        <div>
          <dt>وضعیت ثبت سنجش</dt>
          <dd>{props.sanjeshStatusLabel}</dd>
        </div>
      </dl>
      <Link href={props.dashboardHref} className="gjv2-nav__button gjv2-nav__button--next">
        بازگشت به میز کار انتخاب رشته
      </Link>
    </div>
  );
}
