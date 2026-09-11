import Link from "next/link";
import {
  deleteCounselorExceptionAction,
  saveCounselorScheduleAction,
  upsertCounselorExceptionAction,
} from "@/app/admin/counselor/actions";
import { CounselorCalendarSelect } from "@/components/counselor-os/CounselorCalendarSelect";
import { CounselorScheduleForm } from "@/components/counselor-os/CounselorScheduleForm";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import {
  listManagedCounselorAdvisors,
  resolveManagedBookingAdvisor,
} from "@/lib/counselor-os/advisor";
import { listCounselorCalendarDays } from "@/lib/counselor-os/booking";
import {
  ensureCounselorProfile,
  ensureOrgCounselorAdvisorLinks,
} from "@/lib/counselor-os/profiles";
import { loadCounselorSchedule } from "@/lib/counselor-os/schedule";

export const dynamic = "force-dynamic";

function firstSearchValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function CounselorCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireCounselorContext();
  const params = await searchParams;

  if (ctx.isSupervisor) {
    await ensureOrgCounselorAdvisorLinks(ctx.organizationId);
  } else {
    await ensureCounselorProfile({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      displayName: ctx.displayName,
    });
  }

  const advisors = ctx.isSupervisor
    ? await listManagedCounselorAdvisors(ctx.organizationId)
    : [];
  const requestedAdvisorId = firstSearchValue(params.advisorId);
  const selectedAdvisor = ctx.isSupervisor
    ? (await resolveManagedBookingAdvisor({
        ctx,
        advisorId: requestedAdvisorId || advisors[0]?.id,
      })) ??
      (advisors[0]
        ? await resolveManagedBookingAdvisor({
            ctx,
            advisorId: advisors[0].id,
          })
        : null)
    : await resolveManagedBookingAdvisor({ ctx });

  const schedule = selectedAdvisor
    ? await loadCounselorSchedule(ctx, selectedAdvisor.id)
    : null;
  const enabledWindows =
    schedule?.days.reduce(
      (sum, day) => sum + (day.enabled ? day.windows.length : 0),
      0,
    ) ?? 0;
  const calendarDays =
    selectedAdvisor && schedule
      ? await listCounselorCalendarDays({
          organizationId: ctx.organizationId,
          advisorId: selectedAdvisor.id,
          validFromYmd: schedule.validFromYmd,
          validUntilYmd: schedule.validUntilYmd,
        })
      : [];

  return (
    <div className="cos-page">
      <header className="cos-page__head">
        <div>
          <h1>تقویم مشاور</h1>
          <p>
            تعریف برنامه زمانی و مشاهده نوبت‌های آزاد و رزروشده
            {ctx.isSupervisor ? " · حالت ناظر / مدیر" : ""}
          </p>
        </div>
        <div className="cos-inline-actions">
          {selectedAdvisor ? (
            <a href="#schedule-editor" className="cos-btn cos-btn--primary">
              تعریف / ویرایش برنامه زمانی
            </a>
          ) : null}
          <Link href="/admin/counselor/appointments" className="cos-btn">
            همه جلسات
          </Link>
        </div>
      </header>

      {ctx.isSupervisor && advisors.length > 0 && selectedAdvisor ? (
        <section className="cos-panel">
          <CounselorCalendarSelect
            advisors={advisors}
            selectedId={selectedAdvisor.id}
          />
        </section>
      ) : null}

      {!selectedAdvisor ? (
        <section className="cos-panel">
          {ctx.isSupervisor ? (
            <>
              <p className="cos-empty">هنوز مشاوری تعریف نشده است.</p>
              <div className="cos-inline-actions">
                <Link
                  href="/admin/counselor/counselors"
                  className="cos-btn cos-btn--primary"
                >
                  تعریف مشاور
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="cos-empty">
                پروفایل نوبت‌دهی این مشاور ناقص است. اتصال در حال تعمیر است؛
                صفحه را تازه‌سازی کنید.
              </p>
              <div className="cos-inline-actions">
                <Link href="/admin/counselor/settings" className="cos-btn">
                  حساب مشاور
                </Link>
              </div>
            </>
          )}
        </section>
      ) : (
        <div className="cos-calendar-layout">
          <section className="cos-panel" id="schedule-panel">
            <h2>تنظیم برنامه زمانی</h2>
            <p className="cos-muted">
              برنامه {selectedAdvisor.displayName} — مدت جلسات، بازه فعال،
              برنامه هفتگی و استثناها
            </p>
            {enabledWindows === 0 ? (
              <p className="cos-empty">
                برای این مشاور هنوز برنامه زمانی ثبت نشده است.
              </p>
            ) : null}
            {schedule ? (
              <CounselorScheduleForm
                advisorId={selectedAdvisor.id}
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
            ) : null}
          </section>

          <section className="cos-panel">
            <h2>تقویم و زمان‌های آزاد آینده</h2>
            {calendarDays.length === 0 ? (
              <p className="cos-empty">
                {enabledWindows === 0
                  ? "پس از ذخیره برنامه، زمان‌های آزاد اینجا دیده می‌شوند."
                  : "در بازه فعال، نوبت آزادی برای نمایش نیست."}
              </p>
            ) : (
              <div className="cos-slot-days">
                {calendarDays.map((day) => (
                  <article key={day.key} className="cos-slot-day">
                    <h3>{day.heading}</h3>
                    <ul>
                      {day.slots.map((slot) => (
                        <li
                          key={slot.id}
                          className={
                            slot.status === "booked"
                              ? "cos-slot-row cos-slot-row--booked"
                              : "cos-slot-row cos-slot-row--free"
                          }
                        >
                          <strong>
                            {slot.rangeLabel} {slot.statusLabel}
                          </strong>
                          <span>{slot.sessionLabel}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
