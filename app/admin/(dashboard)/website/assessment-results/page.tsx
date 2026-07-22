import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  deleteAssessmentResult,
  featureAssessmentResultAction,
  unfeatureAssessmentResultAction,
} from "@/app/admin/(dashboard)/website/assessment-results/actions";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminAssessmentOptions } from "@/lib/assessment/assessments";
import { listAdminAssessmentProviders } from "@/lib/assessment/providers";
import { listAdminAssessmentResults } from "@/lib/assessment/results";
import { listAdminStudentGrades } from "@/lib/website/student-grades";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "نتایج آزمون" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function param(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function AdminAssessmentResultsPage({
  searchParams,
}: PageProps) {
  const session = await requirePermission("website.manage");
  const params = await searchParams;
  const q = param(params.q);
  const assessmentId = param(params.assessmentId);
  const providerId = param(params.providerId);
  const gradeId = param(params.gradeId);
  const schoolYear = param(params.schoolYear);
  const featured = (param(params.featured) || "all") as "all" | "yes" | "no";
  const requestedPage = Number.parseInt(param(params.page) || "1", 10);

  const [list, assessments, providers, grades] = await Promise.all([
    listAdminAssessmentResults(session.organization.id, {
      q,
      assessmentId: assessmentId || undefined,
      providerId: providerId || undefined,
      gradeId: gradeId || undefined,
      schoolYear: schoolYear || undefined,
      featured,
      page:
        Number.isSafeInteger(requestedPage) && requestedPage > 0
          ? requestedPage
          : 1,
    }),
    listAdminAssessmentOptions(session.organization.id),
    listAdminAssessmentProviders(session.organization.id),
    listAdminStudentGrades(session.organization.id),
  ]);

  const pageHref = (targetPage: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (assessmentId) query.set("assessmentId", assessmentId);
    if (providerId) query.set("providerId", providerId);
    if (gradeId) query.set("gradeId", gradeId);
    if (schoolYear) query.set("schoolYear", schoolYear);
    if (featured !== "all") query.set("featured", featured);
    if (targetPage > 1) query.set("page", String(targetPage));
    const qs = query.toString();
    return qs
      ? `/admin/website/assessment-results?${qs}`
      : "/admin/website/assessment-results";
  };

  return (
    <>
      <AdminPageHeader
        title="نتایج آزمون"
        description="مدیریت نتایج دانش‌آموزان، رتبه و نمایش ویژه"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "آزمون‌ها", href: "/admin/website/assessments" },
          { label: "نتایج" },
        ]}
        compact
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href="/admin/website/assessment-results/import"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
        >
          ورود از فایل
        </Link>
        <Link
          href="/admin/website/assessments"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
        >
          آزمون‌ها
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
          <span className="mb-1 block text-muted">آزمون</span>
          <select
            name="assessmentId"
            defaultValue={assessmentId}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          >
            <option value="">همه</option>
            {assessments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
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
          <span className="mb-1 block text-muted">سال تحصیلی</span>
          <input
            name="schoolYear"
            defaultValue={schoolYear}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">ویژه</span>
          <select
            name="featured"
            defaultValue={featured}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          >
            <option value="all">همه</option>
            <option value="yes">ویژه</option>
            <option value="no">عادی</option>
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
              <th className="px-3 py-3 text-right">دانش‌آموز</th>
              <th className="px-3 py-3 text-right">آزمون</th>
              <th className="px-3 py-3 text-right">نمره</th>
              <th className="px-3 py-3 text-right">تراز</th>
              <th className="px-3 py-3 text-right">رتبه</th>
              <th className="px-3 py-3 text-right">ویژه</th>
              <th className="px-3 py-3 text-right">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {list.results.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted">
                  نتیجه‌ای یافت نشد.
                </td>
              </tr>
            ) : (
              list.results.map((result) => (
                <tr
                  key={result.id}
                  className="border-b border-border/70 align-top"
                >
                  <td className="px-3 py-3">
                    <div>{result.student.fullName}</div>
                    <div className="text-xs text-muted">
                      {result.student.grade.name}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div>{result.assessment.title}</div>
                    <div className="text-xs text-muted">
                      {result.assessment.provider.name}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {result.score != null
                      ? toPersianDigits(result.score)
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {result.scaledScore != null
                      ? toPersianDigits(result.scaledScore)
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {result.rankSchool != null
                      ? toPersianDigits(result.rankSchool)
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {result.isFeatured ? "بله" : "خیر"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {result.isFeatured ? (
                        <form action={unfeatureAssessmentResultAction}>
                          <input
                            type="hidden"
                            name="resultId"
                            value={result.id}
                          />
                          <button
                            type="submit"
                            className="text-xs text-primary underline"
                          >
                            حذف از برترین‌ها
                          </button>
                        </form>
                      ) : (
                        <form action={featureAssessmentResultAction}>
                          <input
                            type="hidden"
                            name="resultId"
                            value={result.id}
                          />
                          <button
                            type="submit"
                            className="text-xs text-primary underline"
                          >
                            افزودن به برترین‌ها
                          </button>
                        </form>
                      )}
                      <form action={deleteAssessmentResult}>
                        <input type="hidden" name="resultId" value={result.id} />
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
