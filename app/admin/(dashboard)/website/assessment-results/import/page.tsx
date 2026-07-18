import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AssessmentImportWizard } from "@/components/admin/website/AssessmentImportWizard";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminAssessmentOptions } from "@/lib/assessment/assessments";
import { listActiveSubjects } from "@/lib/assessment/subjects";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ورود نتایج آزمون" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AssessmentResultsImportPage({
  searchParams,
}: PageProps) {
  const session = await requirePermission("website.manage");
  const params = await searchParams;
  const initialAssessmentId =
    typeof params.assessmentId === "string" ? params.assessmentId : "";

  const [assessments, subjects] = await Promise.all([
    listAdminAssessmentOptions(session.organization.id),
    listActiveSubjects(session.organization.id),
  ]);

  return (
    <>
      <AdminPageHeader
        title="ورود نتایج آزمون"
        description="بارگذاری فایل Excel یا CSV، تطبیق ستون‌ها، اعتبارسنجی و ورود نتایج"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          {
            label: "نتایج آزمون",
            href: "/admin/website/assessment-results",
          },
          { label: "ورود از فایل" },
        ]}
        compact
      />

      <div className="mb-4">
        <Link
          href="/admin/website/assessment-results"
          className="text-sm text-primary underline"
        >
          بازگشت به نتایج
        </Link>
      </div>

      <AssessmentImportWizard
        assessments={assessments.map((item) => ({
          id: item.id,
          title: item.title,
        }))}
        subjects={subjects.map((subject) => ({
          id: subject.id,
          name: subject.name,
        }))}
        initialAssessmentId={initialAssessmentId || undefined}
      />
    </>
  );
}
