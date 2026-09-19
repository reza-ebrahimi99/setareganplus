import Link from "next/link";
import {
  deleteCounselorExceptionAction,
  saveCounselorScheduleAction,
  upsertCounselorExceptionAction,
} from "@/app/admin/counselor/actions";
import { CounselorCalendarWorkspace } from "@/components/counselor-os/CounselorCalendarWorkspace";
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
  const calendarPreview =
    selectedAdvisor && schedule
      ? await listCounselorCalendarDays({
          organizationId: ctx.organizationId,
          advisorId: selectedAdvisor.id,
          validFromYmd: schedule.firstValidFromYmd,
          validUntilYmd: schedule.firstValidUntilYmd,
          secondValidFromYmd: schedule.secondValidFromYmd,
          secondValidUntilYmd: schedule.secondValidUntilYmd,
        })
      : { firstDays: [], secondDays: [] };

  return (
    <div className="cos-page cos-cal-page">
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
            <a href="#schedule-panel" className="cos-btn cos-btn--primary">
              تعریف / ویرایش برنامه
            </a>
          ) : null}
          <Link href="/admin/counselor/appointments" className="cos-btn">
            همه جلسات
          </Link>
        </div>
      </header>

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
      ) : schedule ? (
        <CounselorCalendarWorkspace
          isSupervisor={ctx.isSupervisor}
          advisorId={selectedAdvisor.id}
          advisorName={selectedAdvisor.displayName}
          advisors={advisors}
          schedule={schedule}
          firstPreviewDays={calendarPreview.firstDays}
          secondPreviewDays={calendarPreview.secondDays}
          saveAction={saveCounselorScheduleAction}
          exceptionAction={upsertCounselorExceptionAction}
          deleteExceptionAction={deleteCounselorExceptionAction}
        />
      ) : null}
    </div>
  );
}
