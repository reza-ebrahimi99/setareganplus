import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-admin";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import {
  buildWorkspaceReport,
  REPORT_BRAND,
  type WorkspaceReportKind,
} from "@/lib/guidance/workspace/exports/report";
import { toPersianDigits } from "@/lib/persian";
import { WorkspacePrintButton } from "@/components/admin/guidance/WorkspacePrintButton";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ publicId: string; kind: string }>;
};

const KINDS: readonly WorkspaceReportKind[] = ["summary", "journey", "notes"];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kind } = await params;
  return { title: `گزارش ${kind}` };
}

export default async function GuidanceExportPrintPage({ params }: PageProps) {
  const session = await requirePermission("guidance.view");
  const enabled = await isGuidanceEnabled(session.organization.id);
  if (!enabled) notFound();

  const { publicId, kind: kindRaw } = await params;
  const kind = KINDS.includes(kindRaw as WorkspaceReportKind)
    ? (kindRaw as WorkspaceReportKind)
    : null;
  if (!kind) notFound();

  const report = await buildWorkspaceReport({
    organizationId: session.organization.id,
    publicId,
    kind,
  });
  if (!report) notFound();

  return (
    <div className="counselor-report" dir="rtl">
      <header className="counselor-report__letterhead">
        <div>
          <p className="counselor-report__brand">{REPORT_BRAND.institute}</p>
          <p>{REPORT_BRAND.partner}</p>
          <p>مشاور مسئول: {REPORT_BRAND.counselor}</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={report.qrDataUrl} alt="QR verification" width={96} height={96} />
      </header>
      <h1>{report.title}</h1>
      <p className="counselor-report__meta">
        شناسه پرونده: {report.publicId} · تولید: {report.generatedAtLabel}
      </p>
      <WorkspacePrintButton />

      <table className="counselor-report__table">
        <tbody>
          {report.rows.map((row) => (
            <tr key={row.label}>
              <th>{row.label}</th>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {kind === "journey" || kind === "summary"
        ? report.steps.map((step) => (
            <section key={step.id} className="counselor-report__step">
              <h2>
                {toPersianDigits(step.id)}. {step.title}
              </h2>
              <p>
                سفر: {step.journeyStatus} · بررسی: {step.reviewStatus}
              </p>
              {kind === "journey" ? (
                <table className="counselor-report__table">
                  <tbody>
                    {step.fields.map((field) => (
                      <tr key={field.label}>
                        <th>{field.label}</th>
                        <td>{field.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </section>
          ))
        : null}

      {kind === "notes"
        ? report.notes.map((note) => (
            <section key={note.stepTitle} className="counselor-report__step">
              <h2>{note.stepTitle}</h2>
              <p>داخلی: {note.internal ?? "—"}</p>
              <p>دانش‌آموز: {note.student ?? "—"}</p>
            </section>
          ))
        : null}

      <footer className="counselor-report__footer">
        <p>
          {REPORT_BRAND.institute} · {REPORT_BRAND.partner} · {REPORT_BRAND.counselor}
        </p>
        <p>تاریخ تولید: {report.generatedAtLabel} · راستی‌آزمایی QR: {report.publicId}</p>
      </footer>
    </div>
  );
}
