import Link from "next/link";
import { CounselorManagementOverview } from "@/components/counselor-os/CounselorManagementOverview";
import { CounselorWorkQueuePanel } from "@/components/counselor-os/CounselorWorkQueuePanel";
import { countPendingCounselorConfirmations } from "@/lib/counselor-os/appointment-lifecycle";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { loadCounselorDashboard } from "@/lib/counselor-os/dashboard";
import { loadManagementOverview } from "@/lib/counselor-os/management-overview";
import { loadCounselorWorkQueue } from "@/lib/counselor-os/work-queue";
import { loadCounselorReviewWorkQueue } from "@/lib/counselor-os/review-work-queue";
import { CounselorReviewWorkQueuePanel } from "@/components/counselor-os/CounselorReviewWorkQueuePanel";
import type { ReviewWorkBucketId } from "@/lib/counselor-os/review-work-queue-types";
import { labelFollowUpPriority } from "@/lib/counselor-os/labels";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string; step?: string; bucket?: string; reviewBucket?: string }>;
};

export default async function CounselorDashboardPage({ searchParams }: Props) {
  const ctx = await requireCounselorContext();
  const sp = await searchParams;
  const [model, workQueue, reviewWorkQueue, mgmt, pendingConfirmations] = await Promise.all([
    loadCounselorDashboard(ctx),
    loadCounselorWorkQueue(ctx),
    loadCounselorReviewWorkQueue(ctx),
    ctx.isSupervisor || ctx.canReview
      ? loadManagementOverview(ctx)
      : Promise.resolve(null),
    countPendingCounselorConfirmations({
      organizationId: ctx.organizationId,
      counselorUserId: ctx.userId,
      canReview: ctx.canReview,
      isSupervisor: ctx.isSupervisor,
    }),
  ]);

  const kpis = [
    ["پرونده‌های فعال", model.stats.totalStudents],
    ["نیازمند پیگیری", model.stats.needsFollowUp],
    ["جلسات آینده", model.stats.upcomingBookings],
    ["پیگیری عقب‌افتاده", model.stats.overdueFollowUps],
    ["پرداخت‌شده‌ها", model.stats.paidStudents],
    ["پرداخت موفق", model.revenue.successfulPaymentCount],
    ["دانش‌آموز پرداخت‌کننده", model.revenue.payingStudentCount],
  ] as const;

  return (
    <div className="cos-page">
      <header className="cos-page__hero">
        <p className="cos-page__eyebrow">اتاق کار مشاور</p>
        <h1>{model.greetingName} عزیز، امروز چه کاری اولویت دارد؟</h1>
        <p className="cos-page__lead">
          {model.viewingAsCounselor
            ? "فقط پرونده‌های تخصیص‌یافته به شما."
            : "نمای ناظر روی مسیر هدایت تحصیلی V2."}
        </p>
      </header>

      {model.capacity ? (
        <section className="cos-stat-grid">
          <article className="cos-stat-card">
            <span>ظرفیت</span>
            <strong>{toPersianDigits(model.capacity.ratioLabel)}</strong>
          </article>
          <article className="cos-stat-card">
            <span>ظرفیت باقی‌مانده</span>
            <strong>
              {model.capacity.unlimited
                ? "نامحدود"
                : toPersianDigits(model.capacity.remainingLabel)}
            </strong>
          </article>
          <article className="cos-stat-card">
            <span>درآمد این ماه</span>
            <strong>{model.revenue.monthLabel}</strong>
          </article>
          <article className="cos-stat-card">
            <span>درآمد کل</span>
            <strong>{model.revenue.totalLabel}</strong>
          </article>
        </section>
      ) : (
        <section className="cos-stat-grid">
          <article className="cos-stat-card">
            <span>درآمد این ماه</span>
            <strong>{model.revenue.monthLabel}</strong>
          </article>
          <article className="cos-stat-card">
            <span>درآمد کل</span>
            <strong>{model.revenue.totalLabel}</strong>
          </article>
        </section>
      )}
      <p className="cos-muted">{model.revenueNote}</p>

      {pendingConfirmations > 0 ? (
        <section className="cos-panel cos-panel--highlight">
          <h2>جلسات نیازمند تأیید</h2>
          <p>
            {toPersianDigits(String(pendingConfirmations))} درخواست منتظر بررسی و تأیید شماست.
          </p>
          <Link href="/admin/counselor/appointments" className="cos-btn cos-btn--primary">
            مشاهده درخواست‌ها
          </Link>
        </section>
      ) : null}

      <section className="cos-stat-grid" aria-label="شاخص‌های عملیاتی">
        {kpis.map(([label, value]) => (
          <article key={label} className="cos-stat-card">
            <span>{label}</span>
            <strong>{toPersianDigits(value)}</strong>
          </article>
        ))}
      </section>

      <CounselorReviewWorkQueuePanel
        model={reviewWorkQueue}
        activeBucket={(sp.reviewBucket as ReviewWorkBucketId | undefined) ?? "all"}
      />

      <CounselorWorkQueuePanel
        model={workQueue}
        q={sp.q}
        step={sp.step}
        bucket={sp.bucket ?? "all"}
      />

      {mgmt ? <CounselorManagementOverview model={mgmt} /> : null}

      <div className="cos-dashboard-grid">
        <section className="cos-panel">
          <h2>صف کار اولویت‌دار (خلاصه)</h2>
          {model.workQueue.length === 0 ? (
            <p className="cos-empty">الان مورد فوری در صف نیست.</p>
          ) : (
            <ul className="cos-work-queue">
              {model.workQueue.map((item, index) => (
                <li key={`${item.studentId}-${index}`}>
                  {item.studentId ? (
                    <Link href={item.href}>
                      <strong>{item.studentName}</strong>
                      <span>{item.reason}</span>
                    </Link>
                  ) : (
                    <Link href={item.href}>
                      <strong>{item.studentName}</strong>
                      <span>{item.reason}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="cos-panel">
          <h2>امروز</h2>
          <h3 className="cos-subhead">جلسات</h3>
          {model.todaySessions.length === 0 ? (
            <p className="cos-empty">جلسه‌ای برای امروز ثبت نشده.</p>
          ) : (
            <ul className="cos-timeline">
              {model.todaySessions.map((item) => (
                <li key={item.id}>
                  <span>{item.whenLabel}</span>
                  <Link href={`/admin/counselor/students/${item.studentId}`}>{item.studentName}</Link>
                </li>
              ))}
            </ul>
          )}
          <h3 className="cos-subhead">پیگیری‌ها</h3>
          {model.todayFollowUps.length === 0 ? (
            <p className="cos-empty">پیگیری امروز ندارید.</p>
          ) : (
            <ul className="cos-follow-list">
              {model.todayFollowUps.map((f) => (
                <li key={f.id}>
                  <strong>{f.title}</strong>
                  <span>
                    {f.studentName} · {labelFollowUpPriority(f.priority)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="cos-panel">
          <h2>فعالیت اخیر</h2>
          {model.recentActivity.length === 0 ? (
            <p className="cos-empty">هنوز فعالیت جدیدی ثبت نشده است.</p>
          ) : (
            <ul className="cos-activity">
              {model.recentActivity.map((item) => (
                <li key={item.id}>
                  <Link href={item.href}>{item.label}</Link>
                  <em>{item.whenLabel}</em>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
