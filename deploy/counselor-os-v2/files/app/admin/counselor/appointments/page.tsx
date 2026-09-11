import Link from "next/link";
import { OpenSessionButton } from "@/components/counselor-os/OpenSessionButton";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { listCounselorAppointments } from "@/lib/counselor-os/appointments";

export const dynamic = "force-dynamic";

export default async function CounselorAppointmentsPage() {
  const ctx = await requireCounselorContext();
  const [today, upcoming, past] = await Promise.all([
    listCounselorAppointments(ctx, "today"),
    listCounselorAppointments(ctx, "upcoming"),
    listCounselorAppointments(ctx, "past"),
  ]);

  const future = upcoming.filter((a) => !today.some((t) => t.id === a.id));

  const sections = [
    { title: "امروز", items: today, empty: "جلسه‌ای برای امروز نیست.", cta: "/admin/counselor/calendar" },
    { title: "آینده", items: future, empty: "رزرو آینده‌ای ندارید.", cta: "/admin/counselor/calendar" },
    { title: "گذشته", items: past.slice(0, 20), empty: "تاریخچه‌ای موجود نیست.", cta: null },
  ];

  return (
    <div className="cos-page">
      <header className="cos-page__head">
        <div>
          <h1>جلسات مشاوره</h1>
          <p>دانش‌آموز، زمان، نوع جلسه و وضعیت پیگیری</p>
        </div>
        <Link href="/admin/counselor/calendar" className="cos-btn cos-btn--ghost">
          تقویم
        </Link>
      </header>

      {sections.map((section) => (
        <section key={section.title} className="cos-panel">
          <h2>{section.title}</h2>
          {section.items.length === 0 ? (
            <div className="cos-empty-state">
              <p className="cos-empty">{section.empty}</p>
              {section.cta ? (
                <Link href={section.cta} className="cos-btn">
                  تعریف زمان آزاد
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="cos-appointment-list">
              {section.items.map((a) => (
                <li key={a.id}>
                  <div>
                    <Link href={`/admin/counselor/students/${a.studentId}`}>
                      <strong>{a.studentName}</strong>
                    </Link>
                    <span>{a.whenLabel}</span>
                    <em>
                      {a.meetingTypeLabel} · {a.statusLabel}
                      {a.hasSessionRecord ? " · یادداشت دارد" : " · بدون یادداشت"}
                    </em>
                  </div>
                  {section.title === "گذشته" ? (
                    a.sessionRecordId ? (
                      <Link href={`/admin/counselor/sessions/${a.sessionRecordId}`} className="cos-link">
                        جزئیات
                      </Link>
                    ) : null
                  ) : (
                    <OpenSessionButton
                      appointmentId={a.id}
                      sessionRecordId={a.sessionRecordId}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
