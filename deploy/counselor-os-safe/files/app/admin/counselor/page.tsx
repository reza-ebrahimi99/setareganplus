import Link from "next/link";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { loadCounselorDashboard } from "@/lib/counselor-os/dashboard";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export default async function CounselorDashboardPage() {
  const ctx = await requireCounselorContext();
  const model = await loadCounselorDashboard(ctx);

  return (
    <div className="cos-page">
      <header className="cos-page__hero">
        <p className="cos-page__eyebrow">صبح بخیر</p>
        <h1>{model.greetingName} عزیز</h1>
        <p className="cos-page__lead">خلاصه عملیات امروز — داده واقعی پرونده‌ها</p>
      </header>

      <section className="cos-stat-grid" aria-label="آمار عملیاتی">
        <article className="cos-stat-card">
          <span>دانش‌آموزان من</span>
          <strong>{toPersianDigits(model.stats.assignedStudents)}</strong>
        </article>
        <article className="cos-stat-card">
          <span>جلسات امروز</span>
          <strong>{toPersianDigits(model.stats.todaySessions)}</strong>
        </article>
        <article className="cos-stat-card">
          <span>رزروهای آینده</span>
          <strong>{toPersianDigits(model.stats.upcomingBookings)}</strong>
        </article>
        <article className="cos-stat-card cos-stat-card--warn">
          <span>پیگیری عقب‌افتاده</span>
          <strong>{toPersianDigits(model.stats.overdueFollowUps)}</strong>
        </article>
        <article className="cos-stat-card">
          <span>مسیرهای ناقص</span>
          <strong>{toPersianDigits(model.stats.incompleteJourneys)}</strong>
        </article>
      </section>

      <div className="cos-dashboard-grid">
        <section className="cos-panel">
          <h2>جلسه بعدی</h2>
          {model.nextSession ? (
            <div className="cos-next-session">
              <p>
                <strong>{model.nextSession.studentName}</strong>
              </p>
              <p>{model.nextSession.whenLabel}</p>
              <div className="cos-inline-actions">
                <Link
                  href={`/admin/counselor/students/${model.nextSession.studentId}`}
                  className="cos-btn cos-btn--primary"
                >
                  ورود به پرونده
                </Link>
              </div>
            </div>
          ) : (
            <p className="cos-empty">برای امروز جلسه‌ای ثبت نشده است.</p>
          )}
        </section>

        <section className="cos-panel">
          <h2>برنامه امروز</h2>
          {model.todayTimeline.length === 0 ? (
            <p className="cos-empty">برنامه امروز خالی است.</p>
          ) : (
            <ul className="cos-timeline">
              {model.todayTimeline.map((item) => (
                <li key={item.id}>
                  <span>{item.whenLabel}</span>
                  <Link href={`/admin/counselor/students/${item.studentId}`}>
                    {item.studentName}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="cos-panel">
          <h2>نیازمند پیگیری</h2>
          {model.dueFollowUps.length === 0 ? (
            <p className="cos-empty">پیگیری فوری ندارید.</p>
          ) : (
            <ul className="cos-follow-list">
              {model.dueFollowUps.map((f) => (
                <li key={f.id}>
                  <strong>{f.title}</strong>
                  <span>{f.studentName}</span>
                  <em>{f.dueLabel}</em>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/counselor/follow-ups" className="cos-link">
            همه پیگیری‌ها
          </Link>
        </section>

        <section className="cos-panel">
          <h2>پرونده‌های فعال</h2>
          <ul className="cos-student-mini-list">
            {model.activeStudents.map((s) => (
              <li key={s.studentId}>
                <Link href={`/admin/counselor/students/${s.studentId}`}>
                  {s.studentName}
                </Link>
                <span>
                  {s.currentStepTitle ?? "—"} ·{" "}
                  {toPersianDigits(s.completionPercentage ?? 0)}٪
                </span>
              </li>
            ))}
          </ul>
          <Link href="/admin/counselor/students" className="cos-link">
            همه دانش‌آموزان
          </Link>
        </section>
      </div>
    </div>
  );
}
