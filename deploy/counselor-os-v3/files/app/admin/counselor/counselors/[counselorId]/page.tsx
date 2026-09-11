import Link from "next/link";
import { notFound } from "next/navigation";
import { unassignStudentFormAction } from "@/app/admin/counselor/actions";
import { CounselorDetailForms } from "@/components/counselor-os/CounselorDetailForms";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { listAssignableGuidanceStudents } from "@/lib/counselor-os/assignments";
import {
  loadCounselorOpsSummary,
  loadCounselorProfileDetail,
} from "@/lib/counselor-os/profiles";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ counselorId: string }> };

export default async function CounselorDetailPage({ params }: Props) {
  const { counselorId } = await params;
  const ctx = await requireCounselorContext();

  let detail;
  try {
    detail = await loadCounselorProfileDetail(ctx, counselorId);
  } catch {
    notFound();
  }

  const [ops, assignable] = await Promise.all([
    loadCounselorOpsSummary({
      organizationId: ctx.organizationId,
      counselorUserId: counselorId,
    }),
    ctx.isSupervisor
      ? listAssignableGuidanceStudents({ ctx, take: 80 })
      : Promise.resolve([]),
  ]);

  return (
    <div className="cos-page">
      <header className="cos-case-hero">
        <div>
          <p className="cos-page__eyebrow">پرونده مشاور</p>
          <h1>{detail.name}</h1>
          <p className="cos-page__lead">
            {[detail.title, detail.specialty, detail.mobile, detail.statusLabel]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="cos-case-hero__stats">
          <div>
            <span>پرونده فعال</span>
            <strong>{toPersianDigits(detail.capacity.activeAssigned)}</strong>
          </div>
          <div>
            <span>ظرفیت</span>
            <strong>
              {detail.capacity.unlimited
                ? "نامحدود"
                : `${toPersianDigits(detail.capacity.activeAssigned)} / ${toPersianDigits(detail.capacity.capacity ?? 0)}`}
            </strong>
          </div>
          <div>
            <span>آزاد</span>
            <strong>
              {detail.capacity.unlimited
                ? "نامحدود"
                : toPersianDigits(detail.capacity.remaining ?? 0)}
            </strong>
          </div>
        </div>
      </header>

      <section className="cos-stat-grid" aria-label="درآمد پرونده‌های تحت پوشش">
        <article className="cos-stat-card">
          <span>این ماه</span>
          <strong>{detail.revenue.monthTomanLabel}</strong>
        </article>
        <article className="cos-stat-card">
          <span>کل</span>
          <strong>{detail.revenue.totalTomanLabel}</strong>
        </article>
        <article className="cos-stat-card">
          <span>پرداخت موفق</span>
          <strong>{toPersianDigits(detail.revenue.successfulPaymentCount)}</strong>
        </article>
        <article className="cos-stat-card">
          <span>دانش‌آموز پرداخت‌کننده</span>
          <strong>{toPersianDigits(detail.revenue.payingStudentCount)}</strong>
        </article>
      </section>
      <p className="cos-muted">مجموع پرداخت پرونده‌های تحت پوشش — بر اساس مشاور فعلی پرونده.</p>

      {detail.photoUrl ? (
        <p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="cos-counselor-photo" src={detail.photoUrl} alt="" />
        </p>
      ) : null}

      <CounselorDetailForms
        counselorUserId={detail.userId}
        firstName={detail.firstName}
        lastName={detail.lastName}
        mobile={detail.mobile}
        title={detail.title}
        specialty={detail.specialty}
        bio={detail.bio}
        capacity={detail.capacity.capacity}
        isActive={detail.isActive}
        isSupervisor={ctx.isSupervisor}
        assignableStudents={assignable.map((s) => ({ id: s.id, fullName: s.fullName }))}
      />

      <div className="cos-dashboard-grid">
        <section className="cos-panel">
          <h2>پرونده‌های فعال</h2>
          {ops.activeStudents.length === 0 ? (
            <p className="cos-empty">پرونده فعالی تخصیص داده نشده.</p>
          ) : (
            <ul className="cos-activity">
              {ops.activeStudents.map((s) => (
                <li key={s.studentId}>
                  <Link href={`/admin/counselor/students/${s.studentId}`}>{s.studentName}</Link>
                  <em>{formatJalaliDateTimeShort(s.assignedAt)}</em>
                  {ctx.isSupervisor ? (
                    <form action={unassignStudentFormAction}>
                      <input type="hidden" name="counselorUserId" value={detail.userId} />
                      <input type="hidden" name="studentId" value={s.studentId} />
                      <button type="submit" className="cos-btn cos-btn--ghost">
                        حذف تخصیص
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="cos-panel">
          <h2>جلسات آینده</h2>
          {ops.upcoming.length === 0 ? (
            <p className="cos-empty">جلسه‌ای در تقویم نیست.</p>
          ) : (
            <ul className="cos-timeline">
              {ops.upcoming.map((item) => (
                <li key={item.id}>
                  <span>{item.whenLabel}</span>
                  <Link href={`/admin/counselor/students/${item.studentId}`}>{item.studentName}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="cos-panel">
          <h2>پیگیری‌های عقب‌افتاده</h2>
          {ops.overdueFollowUps.length === 0 ? (
            <p className="cos-empty">پیگیری عقب‌افتاده‌ای نیست.</p>
          ) : (
            <ul className="cos-follow-list">
              {ops.overdueFollowUps.map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.studentName}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="cos-panel">
          <h2>جلسات اخیر</h2>
          {ops.recentSessions.length === 0 ? (
            <p className="cos-empty">جلسه‌ای ثبت نشده.</p>
          ) : (
            <ul className="cos-session-list">
              {ops.recentSessions.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.subject ?? "جلسه"}</strong>
                    <span>{item.studentName}</span>
                  </div>
                  <Link href={`/admin/counselor/sessions/${item.id}`}>جزئیات</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
