import Link from "next/link";
import { PortalWidget } from "@/components/portal/PortalWidget";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import type { PortalStudentDashboardDto } from "@/lib/portal/student/dashboard";

type PortalAssessmentsWidgetProps = {
  dashboard: PortalStudentDashboardDto;
};

export function PortalAssessmentsWidget({
  dashboard,
}: PortalAssessmentsWidgetProps) {
  const hasLatest = dashboard.latestAssessmentTitle != null;

  return (
    <PortalWidget
      id="assessments"
      module="assessments"
      title="آخرین آزمون"
      icon="chart"
      description="جدیدترین نتیجه ثبت‌شده برای تو."
      action={{ href: "/portal/student/assessments", label: "همه آزمون‌ها" }}
      empty={!hasLatest}
      emptyTitle="هنوز آزمونی ثبت نشده"
      emptyDescription="وقتی مدرسه نتیجه را ثبت کند، نمره و تاریخ همین‌جا می‌آید."
      className="portal-bento__assessments"
    >
      {hasLatest ? (
        <div className="portal-assessment-summary">
          <p className="portal-assessment-summary__title">
            {dashboard.latestAssessmentTitle}
          </p>
          <p className="portal-assessment-summary__score">
            {dashboard.latestScore != null
              ? toPersianDigits(dashboard.latestScore)
              : "—"}
          </p>
          <p className="portal-assessment-summary__date">
            {dashboard.latestAssessmentDate
              ? formatJalaliDateShort(dashboard.latestAssessmentDate)
              : "تاریخ نامشخص"}
          </p>
          {dashboard.averageScore != null ? (
            <p className="portal-assessment-summary__avg">
              میانگین: {toPersianDigits(Math.round(dashboard.averageScore))}
            </p>
          ) : null}
        </div>
      ) : null}
    </PortalWidget>
  );
}

type PortalAchievementsWidgetProps = {
  count: number;
};

export function PortalAchievementsWidget({
  count,
}: PortalAchievementsWidgetProps) {
  return (
    <PortalWidget
      id="achievements"
      module="achievements"
      title="افتخارات"
      icon="trophy"
      description="دستاوردهایی که تا امروز ثبت شده‌اند."
      action={{ href: "/portal/student/achievements", label: "مشاهده" }}
      empty={count === 0}
      emptyTitle="هنوز افتخاری ثبت نشده"
      emptyDescription="مدال‌ها و موفقیت‌هایت به‌محض انتشار اینجا می‌درخشند."
      status={count > 0 ? toPersianDigits(count) : undefined}
      className="portal-bento__achievements"
    >
      {count > 0 ? (
        <div className="portal-achievements-summary">
          <p className="portal-achievements-summary__count">
            {toPersianDigits(count)}
          </p>
          <p className="portal-achievements-summary__label">افتخار ثبت‌شده</p>
          <Link
            href="/portal/student/achievements"
            className="portal-achievements-summary__cta"
          >
            مشاهده مجموعه
          </Link>
        </div>
      ) : null}
    </PortalWidget>
  );
}
