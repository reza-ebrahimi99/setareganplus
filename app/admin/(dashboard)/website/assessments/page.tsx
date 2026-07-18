import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  archiveAssessment,
  deleteAssessment,
  restoreAssessment,
} from "@/app/admin/(dashboard)/website/assessments/actions";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminAssessments } from "@/lib/assessment/assessments";
import { listAdminAssessmentProviders } from "@/lib/assessment/providers";
import { ASSESSMENT_TYPE_LABELS, isAssessmentType } from "@/lib/assessment/types";
import { listAdminStudentGrades } from "@/lib/website/student-grades";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import type { AssessmentType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "آزمون‌ها" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function param(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function AdminAssessmentsPage({ searchParams }: PageProps) {
  const session = await requirePermission("website.manage");
  const params = await searchParams;
  const q = param(params.q);
  const providerId = param(params.providerId);
  const gradeId = param(params.gradeId);
  const assessmentTypeRaw = param(params.assessmentType);
  const assessmentType = isAssessmentType(assessmentTypeRaw)
    ? assessmentTypeRaw
    : "";
  const schoolYear = param(params.schoolYear);
  const published = (param(params.published) || "all") as "all" | "yes" | "no";
  const requestedPage = Number.parseInt(param(params.page) || "1", 10);

  const [list, providers, grades] = await Promise.all([
    listAdminAssessments(session.organization.id, {
      q,
      providerId: providerId || undefined,
      gradeId: gradeId || undefined,
      assessmentType: (assessmentType || "") as AssessmentType | "",
      schoolYear: schoolYear || undefined,
      published,
      page:
        Number.isSafeInteger(requestedPage) && requestedPage > 0
          ? requestedPage
          : 1,
    }),
    listAdminAssessmentProviders(session.organization.id),
    listAdminStudentGrades(session.organization.id),
  ]);

  const pageHref = (targetPage: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (providerId) query.set("providerId", providerId);
    if (gradeId) query.set("gradeId", gradeId);
    if (assessmentType) query.set("assessmentType", assessmentType);
    if (schoolYear) query.set("schoolYear", schoolYear);
    if (published !== "all") query.set("published", published);
    if (targetPage > 1) query.set("page", String(targetPage));
    const qs = query.toString();
    return qs
      ? `/admin/website/assessments?${qs}`
      : "/admin/website/assessments";
  };

  return (
    <>
      <AdminPageHeader
        title="آزمون‌ها"
        description="مدیریت آزمون‌های قلم‌چی، مدرسه، میان‌ترم، المپیاد و سایر سنجش‌ها"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "آزمون‌ها" },
        ]}
        compact
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href="/admin/website/assessments/new"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
        >
          آزمون جدید
        </Link>
        <Link
          href="/admin/website/assessment-providers"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
        >
          ارائه‌دهندگان
        </Link>
        <Link
          href="/admin/website/subjects"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
        >
          دروس
        </Link>
        <Link
          href="/admin/website/assessment-results"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
        >
          نتایج
        </Link>
        <Link
          href="/assessments"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
        >
          مشاهده صفحه عمومی
        </Link>
      </div>

      <form
        method="get"
        className="admin-card mb-4 grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4"
      >
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-muted">جستجو</span>
          <input
            name="q"
            defaultValue={q}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">ارائه‌دهنده</span>
          <select
            name="providerId"
            defaultValue={providerId}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          >
            <option value="">همه</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">پایه</span>
          <select
            name="gradeId"
            defaultValue={gradeId}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          >
            <option value="">همه</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">نوع آزمون</span>
          <select
            name="assessmentType"
            defaultValue={assessmentType}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          >
            <option value="">همه</option>
            {Object.entries(ASSESSMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">سال تحصیلی</span>
          <input
            name="schoolYear"
            defaultValue={schoolYear}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">انتشار</span>
          <select
            name="published"
            defaultValue={published}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          >
            <option value="all">همه</option>
            <option value="yes">منتشرشده</option>
            <option value="no">پیش‌نویس</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="min-h-11 w-full rounded-xl bg-primary px-4 py-2 text-sm text-white"
          >
            اعمال فیلتر
          </button>
        </div>
      </form>

      <div className="admin-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-3 py-3 text-right">عنوان</th>
              <th className="px-3 py-3 text-right">ارائه‌دهنده</th>
              <th className="px-3 py-3 text-right">پایه</th>
              <th className="px-3 py-3 text-right">نوع</th>
              <th className="px-3 py-3 text-right">تاریخ</th>
              <th className="px-3 py-3 text-right">نتایج</th>
              <th className="px-3 py-3 text-right">وضعیت</th>
              <th className="px-3 py-3 text-right">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {list.assessments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted">
                  آزمونی یافت نشد.
                </td>
              </tr>
            ) : (
              list.assessments.map((assessment) => (
                <tr
                  key={assessment.id}
                  className="border-b border-border/70 align-top"
                >
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/website/assessments/${assessment.id}`}
                      className="font-medium text-primary underline"
                    >
                      {assessment.title}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{assessment.provider.name}</td>
                  <td className="px-3 py-3">{assessment.grade.name}</td>
                  <td className="px-3 py-3">
                    {ASSESSMENT_TYPE_LABELS[assessment.assessmentType]}
                  </td>
                  <td className="px-3 py-3">
                    {assessment.assessmentDate
                      ? formatJalaliDateShort(assessment.assessmentDate)
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {toPersianDigits(assessment._count.results)}
                  </td>
                  <td className="px-3 py-3">
                    {assessment.archivedAt
                      ? "بایگانی"
                      : assessment.isPublished
                        ? "منتشر"
                        : "پیش‌نویس"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {assessment.archivedAt ? (
                        <form action={restoreAssessment}>
                          <input
                            type="hidden"
                            name="assessmentId"
                            value={assessment.id}
                          />
                          <button
                            type="submit"
                            className="text-xs text-primary underline"
                          >
                            بازیابی
                          </button>
                        </form>
                      ) : (
                        <form action={archiveAssessment}>
                          <input
                            type="hidden"
                            name="assessmentId"
                            value={assessment.id}
                          />
                          <button
                            type="submit"
                            className="text-xs text-primary underline"
                          >
                            بایگانی
                          </button>
                        </form>
                      )}
                      <form action={deleteAssessment}>
                        <input
                          type="hidden"
                          name="assessmentId"
                          value={assessment.id}
                        />
                        <button
                          type="submit"
                          className="text-xs text-red-700 underline"
                        >
                          حذف
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {list.pageCount > 1 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted">
            صفحه {toPersianDigits(list.page)} از{" "}
            {toPersianDigits(list.pageCount)}
          </p>
          <div className="flex gap-2">
            {list.page > 1 ? (
              <Link
                href={pageHref(list.page - 1)}
                className="rounded-lg border border-border px-3 py-1.5"
              >
                قبلی
              </Link>
            ) : null}
            {list.page < list.pageCount ? (
              <Link
                href={pageHref(list.page + 1)}
                className="rounded-lg border border-border px-3 py-1.5"
              >
                بعدی
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
