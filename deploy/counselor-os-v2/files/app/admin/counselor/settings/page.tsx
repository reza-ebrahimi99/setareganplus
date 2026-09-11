import Link from "next/link";
import { linkBookingAdvisorFormAction } from "@/app/admin/counselor/actions";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import {
  listUnlinkedBookingAdvisors,
  resolveCounselorBookingAdvisor,
} from "@/lib/counselor-os/advisor";
import { listCounselorAvailabilityRules } from "@/lib/counselor-os/booking";

export const dynamic = "force-dynamic";

export default async function CounselorSettingsPage() {
  const ctx = await requireCounselorContext();
  const [advisor, rules, unlinked] = await Promise.all([
    resolveCounselorBookingAdvisor({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
    }),
    listCounselorAvailabilityRules(ctx),
    ctx.canReview ? listUnlinkedBookingAdvisors(ctx.organizationId) : Promise.resolve([]),
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
            {ctx.canReview && unlinked.length > 0 ? (
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
