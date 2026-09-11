import Link from "next/link";
import {
  deleteCounselorExceptionAction,
  saveCounselorScheduleAction,
  upsertCounselorExceptionAction,
} from "@/app/admin/counselor/actions";
import { CounselorScheduleForm } from "@/components/counselor-os/CounselorScheduleForm";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import {
  listManagedCounselorAdvisors,
  resolveCounselorBookingAdvisor,
  resolveManagedBookingAdvisor,
} from "@/lib/counselor-os/advisor";
import { loadCounselorSchedule } from "@/lib/counselor-os/schedule";
import {
  ensureCounselorProfile,
  loadCounselorProfileDetail,
} from "@/lib/counselor-os/profiles";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export default async function CounselorSettingsPage() {
  const ctx = await requireCounselorContext();
  if (ctx.viewingAsCounselor) {
    await ensureCounselorProfile({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      displayName: ctx.displayName,
    });
  }
  const ownAdvisor = ctx.viewingAsCounselor
    ? await resolveCounselorBookingAdvisor({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
      })
    : null;
  const advisor = ctx.isSupervisor
    ? null
    : await resolveManagedBookingAdvisor({ ctx });
  const [schedule, counselors, own] = await Promise.all([
    advisor ? loadCounselorSchedule(ctx, advisor.id) : Promise.resolve(null),
    ctx.isSupervisor
      ? listManagedCounselorAdvisors(ctx.organizationId)
      : Promise.resolve([]),
    ctx.viewingAsCounselor
      ? loadCounselorProfileDetail(ctx, ctx.userId).catch(() => null)
      : Promise.resolve(null),
  ]);
  const ruleCount =
    schedule?.days.reduce(
      (sum, day) => sum + (day.enabled ? day.windows.length : 0),
      0,
    ) ?? 0;

  return (
    <div className="cos-page">
      <header className="cos-page__head">
        <div>
          <h1>حساب مشاور</h1>
          <p>
            {ctx.displayName} · {ctx.roleLabel}
            {ctx.isSupervisor ? " · حالت ناظر / مدیر" : ""}
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
        {ctx.isSupervisor ? (
          counselors.length === 0 ? (
            <>
              <p className="cos-empty">هنوز مشاوری تعریف نشده است.</p>
              <Link href="/admin/counselor/counselors" className="cos-btn cos-btn--primary">
                تعریف مشاور
              </Link>
            </>
          ) : (
            <>
              <p className="cos-muted">
                زمان‌بندی هر مشاور از تقویم مشاور تنظیم می‌شود. حساب مدیر به پروفایل نوبت‌دهی
                متصل نمی‌شود.
              </p>
              <ul className="cos-rule-list">
                {counselors.map((item) => (
                  <li key={item.id}>
                    <strong>{item.displayName}</strong>
                    <Link
                      href={`/admin/counselor/calendar?advisorId=${encodeURIComponent(item.id)}`}
                      className="cos-btn"
                    >
                      برنامه زمانی
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )
        ) : advisor ? (
          <dl className="cos-dl">
            <div>
              <dt>نام در تقویم نوبت‌دهی</dt>
              <dd>{advisor.displayName}</dd>
            </div>
            <div>
              <dt>بازه‌های فعال</dt>
              <dd>{toPersianDigits(ruleCount)} بازه هفتگی</dd>
            </div>
          </dl>
        ) : (
          <p className="cos-empty">
            پروفایل نوبت‌دهی این حساب ناقص بود و در حال تعمیر خودکار است. صفحه را تازه‌سازی کنید.
          </p>
        )}
        <div className="cos-inline-actions">
          <Link
            href={
              ownAdvisor
                ? `/admin/counselor/calendar?advisorId=${encodeURIComponent(ownAdvisor.id)}`
                : "/admin/counselor/calendar"
            }
            className="cos-btn"
          >
            تقویم مشاور
          </Link>
        </div>
      </section>

      {schedule && advisor && !ctx.isSupervisor ? (
        <section className="cos-panel">
          <h2>زمان‌بندی رزرو</h2>
          <p className="cos-muted">
            مدت جلسات، بازه فعال، برنامه هفتگی و استثناها از همین منبع نوبت‌دهی خوانده می‌شود.
          </p>
          <CounselorScheduleForm
            advisorId={advisor.id}
            saveAction={saveCounselorScheduleAction}
            exceptionAction={upsertCounselorExceptionAction}
            deleteExceptionAction={deleteCounselorExceptionAction}
            firstSessionMinutes={schedule.firstSessionMinutes}
            secondSessionMinutes={schedule.secondSessionMinutes}
            validFromYmd={schedule.validFromYmd}
            validUntilYmd={schedule.validUntilYmd}
            days={schedule.days}
            firstDays={schedule.firstDays}
            secondDays={schedule.secondDays}
            firstValidFromYmd={schedule.firstValidFromYmd}
            firstValidUntilYmd={schedule.firstValidUntilYmd}
            secondValidFromYmd={schedule.secondValidFromYmd}
            secondValidUntilYmd={schedule.secondValidUntilYmd}
            exceptions={schedule.exceptions}
          />
        </section>
      ) : null}
    </div>
  );
}
