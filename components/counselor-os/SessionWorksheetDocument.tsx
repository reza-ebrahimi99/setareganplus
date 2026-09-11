import { WorkspacePrintButton } from "@/components/admin/guidance/WorkspacePrintButton";
import { SetareganBrandMark } from "@/components/guidance/brand/SetareganBrandMark";
import { SETAREGAN_LOGO } from "@/lib/guidance/brand/setaregan-logo";

const SECTIONS = [
  "موضوعات مطرح‌شده",
  "تصمیمات جلسه",
  "تغییرات موردنیاز در چیدمان",
  "موارد نیازمند پیگیری",
  "وظیفه دانش‌آموز",
  "وظیفه مشاور / آموزشگاه",
  "یادداشت آزاد",
] as const;

export function SessionWorksheetDocument(props: {
  studentName: string;
  counselorName: string;
  sessionLabel: string;
}) {
  return (
    <div className="counselor-report counselor-worksheet" dir="rtl">
      <header className="counselor-report__letterhead counselor-worksheet__head">
        <SetareganBrandMark size={64} />
        <div>
          <p className="counselor-report__brand">{SETAREGAN_LOGO.institute}</p>
          <p>{SETAREGAN_LOGO.team}</p>
        </div>
      </header>
      <h1>برگه کار جلسه مشاوره انتخاب رشته</h1>
      <p className="counselor-report__hint">
        این برگه برای یادداشت دستی جلسه است. بعداً خلاصه در Counselor OS ثبت می‌شود.
      </p>
      <WorkspacePrintButton />

      <dl className="counselor-worksheet__meta">
        <div>
          <dt>نام دانش‌آموز</dt>
          <dd>{props.studentName}</dd>
        </div>
        <div>
          <dt>نام مشاور</dt>
          <dd>{props.counselorName}</dd>
        </div>
        <div>
          <dt>نوع جلسه</dt>
          <dd>{props.sessionLabel}</dd>
        </div>
        <div>
          <dt>تاریخ</dt>
          <dd className="counselor-worksheet__blank">........................</dd>
        </div>
        <div>
          <dt>ساعت</dt>
          <dd className="counselor-worksheet__blank">........................</dd>
        </div>
      </dl>

      {SECTIONS.map((title) => (
        <section key={title} className="counselor-worksheet__block">
          <h2>{title}</h2>
          <div className="counselor-worksheet__dots" aria-hidden>
            {Array.from({ length: 5 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
        </section>
      ))}

      <footer className="counselor-worksheet__signs">
        <div>
          <span>امضای دانش‌آموز</span>
          <em />
        </div>
        <div>
          <span>امضای مشاور</span>
          <em />
        </div>
      </footer>
    </div>
  );
}
