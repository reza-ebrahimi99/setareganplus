import Link from "next/link";
import { createAvailabilityRuleAction } from "@/app/admin/counselor/actions";
import { AvailabilityRuleForm } from "@/components/counselor-os/AvailabilityRuleForm";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { listCounselorAppointments } from "@/lib/counselor-os/appointments";
import { listCounselorAvailabilityRules } from "@/lib/counselor-os/booking";
import { PERSIAN_WEEKDAYS } from "@/lib/counselor-os/labels";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export default async function CounselorCalendarPage() {
  const ctx = await requireCounselorContext();
  const [rules, upcoming] = await Promise.all([
    listCounselorAvailabilityRules(ctx),
    listCounselorAppointments(ctx, "upcoming"),
  ]);

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
          <h2>قوانین دسترسی</h2>
          {rules.length === 0 ? (
            <p className="cos-empty">هنوز بازه آزادی تعریف نشده است.</p>
          ) : (
            <ul className="cos-rule-list">
              {rules.map((r) => (
                <li key={r.id}>
                  <strong>{PERSIAN_WEEKDAYS[r.weekday] ?? `روز ${r.weekday}`}</strong>
                  <span>
                    {r.startLocalTime} – {r.endLocalTime}
                  </span>
                  <em>ظرفیت {toPersianDigits(r.slotCapacity)}</em>
                </li>
              ))}
            </ul>
          )}
          <AvailabilityRuleForm action={createAvailabilityRuleAction} />
        </section>
      </div>
    </div>
  );
}
