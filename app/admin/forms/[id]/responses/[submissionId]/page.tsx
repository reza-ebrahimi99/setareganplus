import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SubmissionAnswers } from "@/components/admin/forms/SubmissionAnswers";
import { getFormSubmissionStatusLabel } from "@/lib/forms/form-submission-status-labels";
import { loadSubmissionDetail } from "@/lib/forms/load-form-responses";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type SubmissionDetailPageProps = {
  params: Promise<{ id: string; submissionId: string }>;
};

function formatDateTime(value: Date): string {
  return toPersianDigits(
    value.toLocaleString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
}

export async function generateMetadata({
  params,
}: SubmissionDetailPageProps): Promise<Metadata> {
  const { id, submissionId } = await params;
  const result = await loadSubmissionDetail(id, submissionId);
  return {
    title: result.ok
      ? `جزئیات پاسخ · ${result.data.form.title}`
      : "جزئیات پاسخ",
  };
}

export default async function AdminSubmissionDetailPage({
  params,
}: SubmissionDetailPageProps) {
  // TODO(auth): Enforce authenticated admin access before production exposure.

  const { id, submissionId } = await params;
  const result = await loadSubmissionDetail(id, submissionId);

  if (!result.ok && result.reason === "not_found") {
    notFound();
  }

  if (!result.ok) {
    return (
      <>
        <AdminPageHeader
          title="جزئیات پاسخ"
          description="بارگذاری جزئیات پاسخ"
          showNotice
          compact
        />
        <div
          role="alert"
          className="admin-card border-red-200 bg-red-50 px-5 py-4 text-sm leading-7 text-red-800"
        >
          اتصال به پایگاه داده برقرار نشد. پس از پیکربندی PostgreSQL دوباره تلاش
          کنید.
        </div>
      </>
    );
  }

  const { form, submission, answers } = result.data;

  return (
    <>
      <AdminPageHeader
        title="جزئیات پاسخ"
        description={form.title}
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "فرم‌ساز", href: "/admin/forms" },
          { label: form.title, href: `/admin/forms/${form.id}` },
          { label: "پاسخ‌ها", href: `/admin/forms/${form.id}/responses` },
          { label: "جزئیات" },
        ]}
        showNotice
        compact
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
            {getFormSubmissionStatusLabel(submission.status)}
          </span>
          {submission.isDuplicateInForm ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900">
              تکراری
            </span>
          ) : null}
        </div>
        <Link
          href={`/admin/forms/${form.id}/responses`}
          className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
        >
          بازگشت به پاسخ‌ها
        </Link>
      </div>

      <section className="admin-card mb-6 grid gap-3 p-4 text-sm sm:grid-cols-2 sm:p-5">
        <p className="text-muted">
          تاریخ ثبت:{" "}
          <span className="text-foreground">
            {formatDateTime(submission.submittedAt)}
          </span>
        </p>
        <p className="text-muted">
          شعبه: <span className="text-foreground">{submission.branchName}</span>
        </p>
        <p className="text-muted">
          موبایل:{" "}
          <span className="font-mono text-foreground" dir="ltr">
            {submission.mobile
              ? toPersianDigits(submission.mobile)
              : "—"}
          </span>
        </p>
        <p className="text-muted">
          ایمیل:{" "}
          <span className="text-foreground" dir="ltr">
            {submission.email ?? "—"}
          </span>
        </p>
      </section>

      <section aria-labelledby="answers-heading">
        <h2
          id="answers-heading"
          className="mb-4 text-base font-semibold text-primary"
        >
          پاسخ‌ها به ترتیب فرم
        </h2>
        <SubmissionAnswers answers={answers} />
      </section>
    </>
  );
}
