import { PortalWidget } from "@/components/portal/PortalWidget";
import { PortalAssessmentCard } from "@/components/portal/PortalAssessmentCard";
import { PortalModuleShell } from "@/components/portal/apps/PortalModuleShell";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import type { PortalAssessmentResultDto } from "@/lib/portal/student/assessments";
import type { AssessmentCenterInsights } from "@/lib/portal/student/assessment-insights";

type AssessmentCenterScreenProps = {
  results: readonly PortalAssessmentResultDto[];
  insights: AssessmentCenterInsights;
};

function TrendBars({
  trend,
}: {
  trend: AssessmentCenterInsights["trend"];
}) {
  const scores = trend
    .map((item) => item.score)
    .filter((score): score is number => score != null);
  const max = scores.length > 0 ? Math.max(...scores, 1) : 1;

  if (trend.length === 0) {
    return null;
  }

  return (
    <ul className="portal-trend-bars" aria-label="روند نمرات اخیر">
      {[...trend].reverse().map((item) => {
        const height =
          item.score != null ? Math.max(12, Math.round((item.score / max) * 100)) : 8;
        return (
          <li key={item.id} className="portal-trend-bars__item">
            <span
              className="portal-trend-bars__bar"
              style={{ height: `${height}%` }}
              title={
                item.score != null ? toPersianDigits(item.score) : "بدون نمره"
              }
            />
            <span className="portal-trend-bars__label">
              {item.score != null ? toPersianDigits(item.score) : "—"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function AssessmentCenterScreen({
  results,
  insights,
}: AssessmentCenterScreenProps) {
  const empty = results.length === 0;

  return (
    <PortalModuleShell
      hero={{
        eyebrow: "مرکز آزمون",
        title: empty ? "هنوز کارنامه‌ای اینجا نیست" : "مرکز آزمون‌های تو",
        subtitle: empty
          ? "به‌محض ثبت نتایج توسط مدرسه، روند و درس‌ها اینجا زنده می‌شوند."
          : "آخرین نتایج، روند عملکرد و نقاط قوت درسی — بدون جدول‌های شلوغ.",
        icon: "chart",
        accent: "blue",
        status: empty
          ? "در انتظار نتیجه"
          : `${toPersianDigits(insights.count)} نتیجه`,
        primaryCta: { href: "/portal/student", label: "بازگشت به خانه" },
        secondaryCta: {
          href: "/portal/student/achievements",
          label: "افتخارات",
        },
      }}
      actions={[
        {
          id: "home",
          href: "/portal/student",
          label: "خانه",
          description: "خلاصه امروز",
          icon: "home",
          accent: "gold",
        },
        {
          id: "profile",
          href: "/portal/student/profile",
          label: "پروفایل",
          description: "هویت تحصیلی",
          icon: "user",
          accent: "teal",
        },
        {
          id: "achievements",
          href: "/portal/student/achievements",
          label: "افتخارات",
          description: "اتاق مدال‌ها",
          icon: "trophy",
          accent: "orange",
        },
      ]}
      stickyCta={{ href: "/portal/student", label: "خانه پرتال" }}
      sidebar={
        <>
          <PortalWidget
            id="assessment-avg"
            module="assessments"
            title="میانگین"
            icon="chart"
            accent="blue"
            empty={insights.averageScore == null}
            emptyTitle="میانگین هنوز ساخته نشده"
            emptyDescription="با ثبت چند نتیجه، میانگین اینجا دیده می‌شود."
          >
            {insights.averageScore != null ? (
              <p className="portal-stat-xl">
                {toPersianDigits(insights.averageScore)}
              </p>
            ) : null}
          </PortalWidget>
          <PortalWidget
            id="assessment-latest-meta"
            module="assessments"
            title="آخرین آزمون"
            icon="clipboard"
            accent="teal"
            empty={!insights.latest}
            emptyTitle="نتیجه‌ای نیست"
            emptyDescription="اولین نتیجه، این کارت را پر می‌کند."
          >
            {insights.latest ? (
              <div className="portal-sidebar-stack">
                <p className="portal-sidebar-stack__title">
                  {insights.latest.assessmentTitle}
                </p>
                <p className="portal-sidebar-stack__meta">
                  {insights.latest.assessmentDate
                    ? formatJalaliDateShort(insights.latest.assessmentDate)
                    : "تاریخ نامشخص"}
                </p>
              </div>
            ) : null}
          </PortalWidget>
          <PortalWidget
            id="upcoming-exams"
            module="assessments"
            title="آزمون‌های پیش‌رو"
            icon="calendar"
            accent="purple"
            empty
            emptyTitle="برنامه‌ای ثبت نشده"
            emptyDescription="وقتی مدرسه آزمون آینده را اعلام کند، اینجا می‌آید."
          />
        </>
      }
    >
      <div className="portal-module-stack">
        <PortalWidget
          id="recent-assessment"
          module="assessments"
          title="آخرین ارزیابی"
          icon="spark"
          accent="blue"
          empty={!insights.latest}
          emptyTitle="هنوز آزمونی ثبت نشده"
          emptyDescription="پس از برگزاری و ثبت نتایج، کارت اخیر اینجا ظاهر می‌شود."
        >
          {insights.latest ? (
            <PortalAssessmentCard result={insights.latest} />
          ) : null}
        </PortalWidget>

        <PortalWidget
          id="performance-trend"
          module="assessments"
          title="روند عملکرد"
          icon="layers"
          accent="teal"
          empty={insights.trend.every((item) => item.score == null)}
          emptyTitle="روند هنوز شکل نگرفته"
          emptyDescription="با چند نمره متوالی، نمودار ساده پیشرفت رسم می‌شود."
        >
          <TrendBars trend={insights.trend} />
        </PortalWidget>

        <div className="portal-module-duo">
          <PortalWidget
            id="best-subject"
            module="assessments"
            title="قوی‌ترین درس"
            icon="trophy"
            accent="emerald"
            empty={!insights.bestSubject}
            emptyTitle="دروس هنوز تحلیل نشده"
            emptyDescription="وقتی درصد درس‌ها ثبت شود، نقطه قوت اینجا می‌درخشد."
          >
            {insights.bestSubject ? (
              <div className="portal-subject-highlight">
                <p className="portal-subject-highlight__name">
                  {insights.bestSubject.name}
                </p>
                <p className="portal-subject-highlight__value">
                  {toPersianDigits(insights.bestSubject.percentage)}٪
                </p>
              </div>
            ) : null}
          </PortalWidget>
          <PortalWidget
            id="needs-improvement"
            module="assessments"
            title="نیاز به تمرکز"
            icon="spark"
            accent="orange"
            empty={!insights.needsImprovement}
            emptyTitle="هنوز مقایسه‌ای نیست"
            emptyDescription="با چند درس دارای درصد، فرصت بهبود مشخص می‌شود."
          >
            {insights.needsImprovement ? (
              <div className="portal-subject-highlight">
                <p className="portal-subject-highlight__name">
                  {insights.needsImprovement.name}
                </p>
                <p className="portal-subject-highlight__value">
                  {toPersianDigits(insights.needsImprovement.percentage)}٪
                </p>
              </div>
            ) : null}
          </PortalWidget>
        </div>

        <PortalWidget
          id="subject-cards"
          module="assessments"
          title="کارت‌های درسی"
          icon="book"
          accent="purple"
          empty={insights.subjectCards.length === 0}
          emptyTitle="کارت درسی آماده نیست"
          emptyDescription="میانگین درصد هر درس، وقتی داده باشد اینجا چیده می‌شود."
        >
          <ul className="portal-subject-grid">
            {insights.subjectCards.map((subject) => (
              <li
                key={subject.name}
                className="portal-subject-card"
                data-portal-accent="blue"
              >
                <span>{subject.name}</span>
                <strong>{toPersianDigits(subject.percentage)}٪</strong>
                <span
                  className="portal-subject-card__meter"
                  aria-hidden="true"
                >
                  <span style={{ width: `${subject.percentage}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </PortalWidget>

        <PortalWidget
          id="assessment-history"
          module="assessments"
          title="سوابق آزمون"
          icon="clipboard"
          accent="blue"
          empty={results.length === 0}
          emptyTitle="سابقه‌ای برای نمایش نیست"
          emptyDescription="تاریخچه آزمون‌ها به‌محض ثبت نتایج اینجا کامل می‌شود."
        >
          <div className="portal-history-stack">
            {results.map((result) => (
              <PortalAssessmentCard key={result.id} result={result} />
            ))}
          </div>
        </PortalWidget>
      </div>
    </PortalModuleShell>
  );
}
