import { toPersianDigits } from "@/lib/persian";
import type { ManagementOverviewModel } from "@/lib/counselor-os/management-overview";

type Props = { model: ManagementOverviewModel };

export function CounselorManagementOverview({ model }: Props) {
  const steps = [11, 12, 13, 14, 15, 16, 17, 18];
  return (
    <section className="cos-panel cos-mgmt-overview" aria-label="نمای مدیریتی">
      <h2>شاخص‌های مسیر ۱۱–۱۸</h2>
      <div className="cos-stat-grid">
        <article className="cos-stat-card">
          <span>پرونده در مسیر دیررس</span>
          <strong>{toPersianDigits(model.totalActiveLate)}</strong>
        </article>
        <article className="cos-stat-card">
          <span>منتظر مشاور</span>
          <strong>{toPersianDigits(model.waitingCounselor)}</strong>
        </article>
        <article className="cos-stat-card">
          <span>منتظر دانش‌آموز</span>
          <strong>{toPersianDigits(model.waitingStudent)}</strong>
        </article>
        <article className="cos-stat-card">
          <span>عقب‌افتاده</span>
          <strong>{toPersianDigits(model.overdue)}</strong>
        </article>
        <article className="cos-stat-card">
          <span>جلسه امروز</span>
          <strong>{toPersianDigits(model.sessionsToday)}</strong>
        </article>
        <article className="cos-stat-card">
          <span>آماده نهایی‌سازی</span>
          <strong>{toPersianDigits(model.readyFinalize)}</strong>
        </article>
        <article className="cos-stat-card">
          <span>آماده ثبت سنجش</span>
          <strong>{toPersianDigits(model.readySanjesh)}</strong>
        </article>
        <article className="cos-stat-card">
          <span>فوری / مسدود</span>
          <strong>{toPersianDigits(model.blocked)}</strong>
        </article>
      </div>
      <ul className="cos-mgmt-overview__steps">
        {steps.map((s) => (
          <li key={s}>
            مرحله {toPersianDigits(String(s))}:{" "}
            <strong>{toPersianDigits(model.byStep[s] ?? 0)}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
