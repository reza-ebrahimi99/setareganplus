import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkspacePrintButton } from "@/components/admin/guidance/WorkspacePrintButton";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import {
  buildCounselorPrintReport,
  type CounselorReportKind,
} from "@/lib/counselor-os/reports";
import { loadCounselorCaseBundle } from "@/lib/counselor-os/students";

export const dynamic = "force-dynamic";

const KINDS: readonly CounselorReportKind[] = ["case", "holland", "worksheet"];

type Props = { params: Promise<{ studentId: string; kind: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kind } = await params;
  return { title: `گزارش ${kind}` };
}

export default async function CounselorExportPrintPage({ params }: Props) {
  const ctx = await requireCounselorContext();
  const { studentId, kind: kindRaw } = await params;
  const kind = KINDS.includes(kindRaw as CounselorReportKind)
    ? (kindRaw as CounselorReportKind)
    : null;
  if (!kind) notFound();

  let bundle;
  try {
    bundle = await loadCounselorCaseBundle(ctx, studentId);
  } catch {
    notFound();
  }

  const report = buildCounselorPrintReport({
    kind,
    caseModel: bundle.caseModel,
    dossier: bundle.dossier,
  });

  return (
    <div className="counselor-report" dir="rtl">
      <header className="counselor-report__letterhead">
        <div>
          <p className="counselor-report__brand">{report.brand.institute}</p>
          <p>{report.brand.partner}</p>
          <p>مشاور مسئول: {report.brand.counselor}</p>
        </div>
      </header>
      <h1>{report.title}</h1>
      <p className="counselor-report__meta">
        {report.studentName} · تولید: {report.generatedAtLabel}
      </p>
      <p className="counselor-report__hint">
        دکمه زیر پنجره چاپ را باز می‌کند. مقصد را «Save as PDF / ذخیره به‌صورت PDF» بگذارید، کاغذ A4 و حاشیه‌ها را پیش‌فرض نگه دارید.
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

      {report.sections.map((section) => (
        <section key={section.title} className="counselor-report__step">
          <h2>{section.title}</h2>
          {section.lines.length > 0 ? (
            <table className="counselor-report__table">
              <tbody>
                {section.lines.map((line) => (
                  <tr key={`${section.title}-${line.label}`}>
                    <th>{line.label}</th>
                    <td>{line.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {section.noteSpace ? (
            <div className="counselor-report__notespace" aria-hidden>
              <p>یادداشت مشاور:</p>
              <div className="counselor-report__lines" />
            </div>
          ) : null}
        </section>
      ))}

      <footer className="counselor-report__footer">
        <p>
          {report.brand.institute} · {report.brand.partner} · {report.brand.counselor}
        </p>
        <p>تاریخ تولید: {report.generatedAtLabel} · مناسب چاپ A4</p>
      </footer>
    </div>
  );
}
