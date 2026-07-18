import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import { loadStudentPortalDashboard } from "@/lib/portal/student/dashboard";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

export const metadata: Metadata = {
  title: "پرتال دانش‌آموز",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudentPortalHomePage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.authorizedStudents[0]?.studentId;
  if (!studentId) {
    return (
      <PortalEmptyState
        title="دسترسی فعال نیست"
        description="حساب دانش‌آموزی برای شما تعریف نشده است. لطفاً با مدرسه تماس بگیرید."
      />
    );
  }

  const dashboard = await loadStudentPortalDashboard(context, studentId);

  return (
    <div className="space-y-6">
      <section className="admin-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
            {dashboard.portraitUrl ? (
              <Image
                src={dashboard.portraitUrl}
                alt={dashboard.studentName}
                fill
                unoptimized
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-lg font-semibold text-primary/40">
                {dashboard.studentName.slice(0, 1)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-primary sm:text-2xl">
              {dashboard.studentName}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {[dashboard.gradeName, dashboard.schoolYear].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="admin-card p-4">
          <p className="text-xs text-muted">آخرین نمره</p>
          <p className="mt-2 text-2xl font-bold text-primary">
            {dashboard.latestScore != null
              ? toPersianDigits(dashboard.latestScore)
              : "—"}
          </p>
          {dashboard.latestAssessmentTitle ? (
            <p className="mt-1 text-xs text-muted">{dashboard.latestAssessmentTitle}</p>
          ) : null}
        </div>
        <div className="admin-card p-4">
          <p className="text-xs text-muted">میانگین</p>
          <p className="mt-2 text-2xl font-bold text-primary">
            {dashboard.averageScore != null
              ? toPersianDigits(Math.round(dashboard.averageScore))
              : "—"}
          </p>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs text-muted">تعداد آزمون</p>
          <p className="mt-2 text-2xl font-bold text-primary">
            {toPersianDigits(dashboard.assessmentCount)}
          </p>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs text-muted">افتخارات</p>
          <p className="mt-2 text-2xl font-bold text-primary">
            {toPersianDigits(dashboard.achievementCount)}
          </p>
        </div>
      </section>

      {dashboard.trendPoints.length > 0 ? (
        <section className="admin-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-primary sm:text-lg">
              روند اخیر
            </h2>
            <Link
              href="/portal/student/assessments"
              className="text-sm font-medium text-secondary underline-offset-2 hover:underline"
            >
              همه آزمون‌ها
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {dashboard.trendPoints.map((point) => (
              <li
                key={`${point.assessmentTitle}-${point.assessmentDate?.toISOString() ?? "na"}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary">
                    {point.assessmentTitle}
                  </p>
                  <p className="text-xs text-muted">
                    {point.assessmentDate
                      ? formatJalaliDateShort(point.assessmentDate)
                      : "—"}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-secondary">
                  {point.score != null ? toPersianDigits(point.score) : "—"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <PortalEmptyState
          title="هنوز نتیجه آزمونی ثبت نشده"
          description="به محض ثبت نتایج آزمون در مدرسه، اینجا نمایش داده می‌شود."
        />
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/portal/student/assessments"
          className="admin-card px-4 py-4 text-sm font-medium text-primary transition hover:border-secondary/40"
        >
          مشاهده سوابق آزمون
        </Link>
        <Link
          href="/portal/student/achievements"
          className="admin-card px-4 py-4 text-sm font-medium text-primary transition hover:border-secondary/40"
        >
          مشاهده افتخارات
        </Link>
      </section>
    </div>
  );
}
