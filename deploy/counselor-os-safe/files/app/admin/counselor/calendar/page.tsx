import Link from "next/link";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { createAvailabilityRuleAction } from "@/app/admin/counselor/actions";
import { listCounselorAvailabilityRules } from "@/lib/counselor-os/booking";
import { AvailabilityRuleForm } from "@/components/counselor-os/AvailabilityRuleForm";
import { toPersianDigits } from "@/lib/persian";

const WEEKDAYS = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
];

export const dynamic = "force-dynamic";

export default async function CounselorCalendarPage() {
  const ctx = await requireCounselorContext();
  const rules = await listCounselorAvailabilityRules(ctx);

  return (
    <div className="cos-page">
      <header className="cos-page__head">
        <div>
          <h1>تقویم مشاور</h1>
          <p>زمان‌های آزاد برای رزرو جلسه مشاوره</p>
        </div>
      </header>

      <div className="cos-dashboard-grid">
        <section className="cos-panel">
          <h2>افزودن بازه زمانی</h2>
          <AvailabilityRuleForm action={createAvailabilityRuleAction} />
        </section>

        <section className="cos-panel">
          <h2>قوانین فعال</h2>
          {rules.length === 0 ? (
            <p className="cos-empty">در حال حاضر زمان آزادی برای رزرو وجود ندارد.</p>
          ) : (
            <ul className="cos-rule-list">
              {rules.map((r) => (
                <li key={r.id}>
                  <strong>{WEEKDAYS[r.weekday] ?? r.weekday}</strong>
                  <span>
                    {r.startLocalTime} – {r.endLocalTime}
                  </span>
                  <em>ظرفیت {toPersianDigits(r.slotCapacity)}</em>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/bookings/calendar" className="cos-link">
            مدیریت پیشرفته نوبت‌دهی
          </Link>
        </section>
      </div>
    </div>
  );
}
