import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalAssessmentCard } from "@/components/portal/PortalAssessmentCard";
import { PortalAchievementCard } from "@/components/portal/PortalAchievementCard";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import {
  isPortalError,
  persianPortalError,
  requireGuardianPortalAccess,
} from "@/lib/portal/auth";
import { loadGuardianStudentDashboard } from "@/lib/portal/guardian/student-dashboard";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

type PageProps = {
  params: Promise<{ studentId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { studentId } = await params;
  const context = await requireGuardianPortalAccess();
  const student = context.authorizedStudents.find(
    (row) => row.studentId === studentId,
  );
  return {
    title: student ? student.studentName : "فرزند",
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function ParentStudentDetailPage({ params }: PageProps) {
  const { studentId } = await params;
  const context = await requireGuardianPortalAccess();

  let data;
  try {
    data = await loadGuardianStudentDashboard(context, studentId);
  } catch (error) {
    if (isPortalError(error)) {
      if (error.code === "STUDENT_ACCESS_DENIED" || error.code === "NOT_FOUND") {
        notFound();
      }
      return (
        <PortalEmptyState
          title="دسترسی محدود"
          description={persianPortalError(error)}
        />
      );
    }
    throw error;
  }

  const { access, dashboard, assessments, achievements } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/portal/parent/students"
          className="text-sm font-medium text-secondary underline-offset-2 hover:underline"
        >
          بازگشت به فهرست
        </Link>
      </div>

      <section className="admin-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
            {access.portraitUrl ? (
              <Image
                src={access.portraitUrl}
                alt={access.studentName}
                fill
                unoptimized
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-lg font-semibold text-primary/40">
                {access.studentName.slice(0, 1)}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary sm:text-2xl">
              {access.studentName}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {[access.gradeName, access.schoolYear].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      </section>

      {dashboard ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="admin-card p-4">
            <p className="text-xs text-muted">آخرین نمره</p>
            <p className="mt-2 text-2xl font-bold text-primary">
              {dashboard.latestScore != null
                ? toPersianDigits(dashboard.latestScore)
                : "—"}
            </p>
            {dashboard.latestAssessmentTitle ? (
              <p className="mt-1 text-xs text-muted">
                {dashboard.latestAssessmentTitle}
              </p>
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
      ) : null}

      {dashboard?.trendPoints.length ? (
        <section className="admin-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-primary sm:text-lg">
            روند اخیر
          </h2>
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
      ) : null}

      {access.canViewAcademicData ? (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-primary sm:text-lg">
            آزمون‌ها
          </h2>
          {assessments.length === 0 ? (
            <PortalEmptyState
              title="هنوز نتیجه‌ای ثبت نشده"
              description="سوابق آزمون این دانش‌آموز پس از ثبت توسط مدرسه نمایش داده می‌شود."
            />
          ) : (
            <div className="space-y-4">
              {assessments.slice(0, 3).map((result) => (
                <PortalAssessmentCard key={result.id} result={result} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {access.canViewAchievements ? (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-primary sm:text-lg">
            افتخارات
          </h2>
          {achievements.length === 0 ? (
            <PortalEmptyState
              title="افتخاری ثبت نشده"
              description="افتخارات این دانش‌آموز پس از ثبت توسط مدرسه نمایش داده می‌شود."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {achievements.slice(0, 4).map((achievement) => (
                <PortalAchievementCard
                  key={achievement.id}
                  achievement={achievement}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {!access.canViewAcademicData && !access.canViewAchievements ? (
        <PortalEmptyState
          title="دسترسی محدود"
          description="برای مشاهده اطلاعات این دانش‌آموز با مدرسه تماس بگیرید."
        />
      ) : null}
    </div>
  );
}
