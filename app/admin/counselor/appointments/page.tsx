import Link from "next/link";
import { OpenSessionButton } from "@/components/counselor-os/OpenSessionButton";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { listCounselorAppointments } from "@/lib/counselor-os/appointments";

export const dynamic = "force-dynamic";

export default async function CounselorAppointmentsPage() {
  const ctx = await requireCounselorContext();
  const [upcoming, past] = await Promise.all([
    listCounselorAppointments(ctx, "upcoming"),
    listCounselorAppointments(ctx, "past"),
  ]);

  return (
    <div className="cos-page">
      <header className="cos-page__head">
        <div>
          <h1>جلسات مشاوره</h1>
          <p>رزروهای آینده و تاریخچه جلسات</p>
        </div>
        <Link href="/admin/counselor/calendar" className="cos-btn cos-btn--ghost">
          مدیریت تقویم
        </Link>
      </header>

      <section className="cos-panel">
        <h2>رزروهای آینده</h2>
        {upcoming.length === 0 ? (
          <p className="cos-empty">جلسه آینده‌ای ثبت نشده است.</p>
        ) : (
          <ul className="cos-appointment-list">
            {upcoming.map((a) => (
              <li key={a.id}>
                <div>
                  <Link href={`/admin/counselor/students/${a.studentId}`}>
                    <strong>{a.studentName}</strong>
                  </Link>
                  <span>{a.whenLabel}</span>
                  <em>{a.meetingType}</em>
                </div>
                <OpenSessionButton
                  appointmentId={a.id}
                  sessionRecordId={a.sessionRecordId}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cos-panel">
        <h2>گذشته</h2>
        {past.length === 0 ? (
          <p className="cos-empty">تاریخچه‌ای موجود نیست.</p>
        ) : (
          <ul className="cos-appointment-list cos-appointment-list--muted">
            {past.slice(0, 20).map((a) => (
              <li key={a.id}>
                <div>
                  <Link href={`/admin/counselor/students/${a.studentId}`}>
                    <strong>{a.studentName}</strong>
                  </Link>
                  <span>{a.whenLabel}</span>
                </div>
                {a.sessionRecordId ? (
                  <Link href={`/admin/counselor/sessions/${a.sessionRecordId}`} className="cos-link">
                    جزئیات
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
