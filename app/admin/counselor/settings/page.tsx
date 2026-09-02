import Link from "next/link";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { resolveCounselorBookingAdvisor } from "@/lib/counselor-os/advisor";
import { listCounselorAvailabilityRules } from "@/lib/counselor-os/booking";

export const dynamic = "force-dynamic";

export default async function CounselorSettingsPage() {
  const ctx = await requireCounselorContext();
  const [advisor, rules] = await Promise.all([
    resolveCounselorBookingAdvisor({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
    }),
    listCounselorAvailabilityRules(ctx),
  ]);

  return (
    <div className="cos-page">
      <header className="cos-page__head">
        <div>
          <h1>حساب کاربری</h1>
          <p>{ctx.displayName}</p>
        </div>
      </header>

      <section className="cos-panel">
        <h2>پروفایل نوبت‌دهی</h2>
        {advisor ? (
          <dl className="cos-dl">
            <div>
              <dt>نام در تقویم</dt>
              <dd>{advisor.displayName}</dd>
            </div>
            <div>
              <dt>قوانین فعال</dt>
              <dd>{rules.length} بازه</dd>
            </div>
          </dl>
        ) : (
          <p className="cos-empty">
            پروفایل مشاور در سیستم نوبت‌دهی یافت نشد. با مدیر سامانه تماس بگیرید.
          </p>
        )}
        <div className="cos-inline-actions">
          <Link href="/admin/counselor/calendar" className="cos-btn">
            تقویم مشاور
          </Link>
          <Link href="/admin/guidance" className="cos-btn cos-btn--ghost">
            میز کار پرونده
          </Link>
        </div>
      </section>

      <section className="cos-panel">
        <h2>خروج</h2>
        <form action="/portal/logout" method="post">
          <input type="hidden" name="next" value="/guidance" />
          <button type="submit" className="cos-btn cos-btn--ghost">
            خروج از حساب
          </button>
        </form>
      </section>
    </div>
  );
}
