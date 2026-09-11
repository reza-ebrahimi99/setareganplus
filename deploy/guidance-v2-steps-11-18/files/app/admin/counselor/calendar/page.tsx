import Link from "next/link";
import {
  deleteCounselorExceptionAction,
  saveCounselorScheduleAction,
  upsertCounselorExceptionAction,
} from "@/app/admin/counselor/actions";
import { CounselorScheduleForm } from "@/components/counselor-os/CounselorScheduleForm";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { listCounselorAppointments } from "@/lib/counselor-os/appointments";
import { loadCounselorSchedule } from "@/lib/counselor-os/schedule";
import { PERSIAN_WEEKDAYS } from "@/lib/counselor-os/labels";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export default async function CounselorCalendarPage() {
  const ctx = await requireCounselorContext();
  const [schedule, upcoming] = await Promise.all([
    loadCounselorSchedule(ctx),
    listCounselorAppointments(ctx, "upcoming"),
  ]);
  const rules = schedule?.days.flatMap((day) =>
    day.enabled
      ? day.windows.map((window) => ({
          weekday: day.weekday,
          startLocalTime: window.startLocalTime,
          endLocalTime: window.endLocalTime,
        }))
      : [],
  ) ?? [];

  const grouped = new Map<string, typeof upcoming>();
  for (const item of upcoming) {
    const key = `${item.weekdayLabel} · ${item.whenLabel.split("،")[0] ?? item.dateKey}`;
    const list = grouped.get(key) ?? [];
    list.push(item);
    grouped.set(key, list);
  }

  return (
    <div className="cos-page">
      <header className="cos-page__head">
        <div>
          <h1>تقویم مشاور</h1>
          <p>زمان‌های آزاد و رزروهای آینده — ساعت ۲۴ ساعته، روزهای شمسی</p>
        </div>
        <Link href="/admin/counselor/appointments" className="cos-btn">
          همه جلسات
        </Link>
      </header>

      <div className="cos-dashboard-grid">
        <section className="cos-panel">
          <h2>رزروهای آینده</h2>
          {grouped.size === 0 ? (
            <p className="cos-empty">رزرو آینده‌ای ثبت نشده است.</p>
          ) : (
            <div className="cos-schedule">
              {[...grouped.entries()].map(([day, items]) => (
                <article key={day}>
                  <h3>{day}</h3>
                  <ul>
                    {items.map((item) => (
                      <li key={item.id}>
                        <Link href={`/admin/counselor/students/${item.studentId}`}>
                          {item.studentName}
                        </Link>
                        <span>
                          {item.whenLabel} · {item.meetingTypeLabel}
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="cos-panel">
          <h2>برنامه زمانی مشاور</h2>
          {schedule ? (
            <>
              {rules.length === 0 ? (
                <p className="cos-empty">هنوز بازه آزادی تعریف نشده است.</p>
              ) : (
                <ul className="cos-rule-list">
                  {rules.map((r) => (
                    <li key={`${r.weekday}-${r.startLocalTime}-${r.endLocalTime}`}>
                      <strong>{PERSIAN_WEEKDAYS[r.weekday] ?? `روز ${r.weekday}`}</strong>
                      <span>
                        {toPersianDigits(r.startLocalTime)} – {toPersianDigits(r.endLocalTime)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <CounselorScheduleForm
                saveAction={saveCounselorScheduleAction}
                exceptionAction={upsertCounselorExceptionAction}
                deleteExceptionAction={deleteCounselorExceptionAction}
                firstSessionMinutes={schedule.firstSessionMinutes}
                secondSessionMinutes={schedule.secondSessionMinutes}
                validFromYmd={schedule.validFromYmd}
                validUntilYmd={schedule.validUntilYmd}
                days={schedule.days}
                exceptions={schedule.exceptions}
              />
            </>
          ) : (
            <p className="cos-empty">
              ابتدا حساب خود را به پروفایل نوبت‌دهی متصل کنید.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
