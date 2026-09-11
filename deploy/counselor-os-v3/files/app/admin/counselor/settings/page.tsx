import Link from "next/link";
import { linkBookingAdvisorFormAction } from "@/app/admin/counselor/actions";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import {
  listUnlinkedBookingAdvisors,
  resolveCounselorBookingAdvisor,
} from "@/lib/counselor-os/advisor";
import { listCounselorAvailabilityRules } from "@/lib/counselor-os/booking";
import { loadCounselorProfileDetail } from "@/lib/counselor-os/profiles";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export default async function CounselorSettingsPage() {
  const ctx = await requireCounselorContext();
  const [advisor, rules, unlinked, own] = await Promise.all([
    resolveCounselorBookingAdvisor({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
    }),
    listCounselorAvailabilityRules(ctx),
    ctx.isSupervisor ? listUnlinkedBookingAdvisors(ctx.organizationId) : Promise.resolve([]),
    ctx.viewingAsCounselor
      ? loadCounselorProfileDetail(ctx, ctx.userId).catch(() => null)
      : Promise.resolve(null),
  ]);

  return (
    <div className="cos-page">
      <header className="cos-page__head">
        <div>
          <h1>حساب مشاور</h1>
          <p>
            {ctx.displayName} · {ctx.roleLabel}
            {ctx.isSupervisor ? " · حالت ناظر" : ""}
          </p>
        </div>
      </header>

      {own ? (
        <section className="cos-panel">
          <h2>ظرفیت و درآمد خودم</h2>
          <dl className="cos-dl cos-dl--grid">
            <div>
              <dt>پرونده فعال / ظرفیت</dt>
              <dd>{toPersianDigits(own.capacity.ratioLabel)}</dd>
            </div>
            <div>
              <dt>باقی‌مانده</dt>
              <dd>
                {own.capacity.unlimited
                  ? "نامحدود"
                  : toPersianDigits(own.capacity.remainingLabel)}
              </dd>
            </div>
            <div>
              <dt>این ماه</dt>
              <dd>{own.revenue.monthTomanLabel}</dd>
            </div>
            <div>
              <dt>کل</dt>
              <dd>{own.revenue.totalTomanLabel}</dd>
            </div>
          </dl>
          <p className="cos-muted">مجموع پرداخت پرونده‌های تحت پوشش — مشاور نمی‌تواند ظرفیت را تغییر دهد.</p>
          <Link href={`/admin/counselor/counselors/${own.userId}`} className="cos-btn">
            مشاهده پرونده خودم
          </Link>
        </section>
      ) : null}

      <section className="cos-panel">
        <h2>هویت و نوبت‌دهی</h2>
        {advisor ? (
          <dl className="cos-dl">
            <div>
              <dt>نام در تقویم نوبت‌دهی</dt>
              <dd>{advisor.displayName}</dd>
            </div>
            <div>
              <dt>بازه‌های فعال</dt>
              <dd>{rules.length} قانون</dd>
            </div>
          </dl>
        ) : (
          <div>
            <p className="cos-empty">
              این حساب هنوز به پروفایل نوبت‌دهی متصل نیست. اتصال باید صریح باشد و خودکار انجام نمی‌شود.
            </p>
            {ctx.isSupervisor && unlinked.length > 0 ? (
              <form action={linkBookingAdvisorFormAction} className="cos-form-stack">
                <label>
                  انتخاب پروفایل مشاور
                  <select name="advisorId" required defaultValue="">
                    <option value="" disabled>
                      انتخاب کنید
                    </option>
                    {unlinked.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="cos-btn cos-btn--primary">
                  اتصال صریح پروفایل
                </button>
              </form>
            ) : (
              <p className="cos-muted">
                اگر مدیر هستید، ابتدا یک پروفایل مشاور بدون اتصال در نوبت‌دهی بسازید؛ سپس همین‌جا متصل کنید.
              </p>
            )}
          </div>
        )}
        <div className="cos-inline-actions">
          <Link href="/admin/counselor/calendar" className="cos-btn">
            تقویم مشاور
          </Link>
        </div>
      </section>
    </div>
  );
}
