import Link from "next/link";
import { PortalIcon } from "@/components/portal/icons";
import { StudentCounselingBookingForm } from "@/components/counselor-os/StudentCounselingBookingForm";
import {
  loadCounselorAvailableSlots,
  loadStudentUpcomingAppointment,
} from "@/lib/counselor-os/booking";
import { resolveStudentCounselorAdvisor } from "@/lib/counselor-os/student-advisor";

export async function StudentCounselingPanel({
  organizationId,
  studentId,
  userId,
  studentFirstName,
  studentLastName,
  mobile,
  mode,
}: {
  organizationId: string;
  studentId: string;
  userId: string;
  studentFirstName: string;
  studentLastName: string;
  mobile: string;
  mode: "card" | "full";
}) {
  const [upcoming, advisor] = await Promise.all([
    loadStudentUpcomingAppointment({ organizationId, studentId }),
    resolveStudentCounselorAdvisor({ organizationId, studentId }),
  ]);

  if (mode === "card") {
    return (
      <Link
        href={
          upcoming
            ? "/portal/student/services/guidance?view=appointments"
            : "/portal/student/services/guidance?view=appointments&book=1"
        }
        className="guidance-command-card guidance-command-card--counseling"
      >
        <span className="guidance-command-card__icon" aria-hidden="true">
          <PortalIcon name="calendar" className="size-6" />
        </span>
        <span className="guidance-command-card__eyebrow">مشاوره</span>
        <strong className="guidance-command-card__title">جلسه مشاوره</strong>
        <em className="guidance-command-card__desc">
          {upcoming
            ? `جلسه بعدی: ${upcoming.whenLabel}`
            : "رزرو جلسه مشاوره با مشاور انتخاب رشته"}
        </em>
        <span className="guidance-command-card__cta">
          {upcoming ? "مشاهده جزئیات" : "رزرو جلسه مشاوره"}
          <PortalIcon name="calendar" className="size-4" aria-hidden="true" />
        </span>
      </Link>
    );
  }

  const slots =
    advisor && !upcoming
      ? await loadCounselorAvailableSlots({
          organizationId,
          advisorId: advisor.id,
        })
      : [];

  return (
    <div className="guidance-counseling-page">
      <header className="guidance-counseling-page__head">
        <Link href="/portal/student/services/guidance" className="guidance-counseling-back">
          بازگشت به داشبورد
        </Link>
        <h1>رزرو جلسه مشاوره</h1>
        {advisor ? <p>مشاور: {advisor.displayName}</p> : null}
      </header>

      {upcoming ? (
        <section className="guidance-counseling-upcoming">
          <h2>جلسه آینده شما</h2>
          <p>
            <strong>{upcoming.whenLabel}</strong>
            {upcoming.advisorName ? ` · ${upcoming.advisorName}` : ""}
          </p>
        </section>
      ) : advisor ? (
        <StudentCounselingBookingForm slots={slots} />
      ) : (
        <p className="cos-empty">
          هنوز مشاوری به پرونده شما اختصاص داده نشده است. پس از فعال‌سازی بسته، با پشتیبانی تماس
          بگیرید.
        </p>
      )}
    </div>
  );
}
