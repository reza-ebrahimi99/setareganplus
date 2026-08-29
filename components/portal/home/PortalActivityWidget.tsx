import { PortalWidget } from "@/components/portal/PortalWidget";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import type { PortalStudentDashboardDto } from "@/lib/portal/student/dashboard";

type PortalActivityWidgetProps = {
  trendPoints: PortalStudentDashboardDto["trendPoints"];
};

/** Recent activity from existing assessment trend only — never invented. */
export function PortalActivityWidget({
  trendPoints,
}: PortalActivityWidgetProps) {
  const items = trendPoints.slice(0, 5);

  return (
    <PortalWidget
      id="activity"
      module="activity"
      title="فعالیت‌های اخیر"
      icon="layers"
      description="بر اساس نتایج واقعی آزمون — بدون داده ساختگی."
      action={
        items.length > 0
          ? { href: "/portal/student/assessments", label: "جزئیات بیشتر" }
          : undefined
      }
      empty={items.length === 0}
      emptyTitle="هنوز فعالیتی دیده نمی‌شود"
      emptyDescription="وقتی آزمون یا قدم مسیر ثبت شود، جریان فعالیت اینجا شکل می‌گیرد."
      className="portal-bento__activity"
    >
      {items.length > 0 ? (
        <ul className="portal-activity-list">
          {items.map((point) => (
            <li
              key={`${point.assessmentTitle}-${point.assessmentDate?.toISOString() ?? "na"}`}
              className="portal-activity-list__item"
            >
              <div className="min-w-0">
                <p className="portal-activity-list__title">
                  {point.assessmentTitle}
                </p>
                <p className="portal-activity-list__meta">
                  {point.assessmentDate
                    ? formatJalaliDateShort(point.assessmentDate)
                    : "—"}
                </p>
              </div>
              <p className="portal-activity-list__score">
                {point.score != null ? toPersianDigits(point.score) : "—"}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </PortalWidget>
  );
}
