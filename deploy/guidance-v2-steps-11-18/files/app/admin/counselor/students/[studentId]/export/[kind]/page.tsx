import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkspacePrintButton } from "@/components/admin/guidance/WorkspacePrintButton";
import { HollandScoreChart } from "@/components/counselor-os/HollandScoreChart";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import {
  buildCounselorPrintReport,
  buildHollandFullPrintReport,
  type CounselorReportKind,
} from "@/lib/counselor-os/reports";
import { loadCounselorLateJourney } from "@/lib/counselor-os/late-journey";
import { loadCounselorCaseBundle } from "@/lib/counselor-os/students";
import { LatePrintDocument } from "@/components/counselor-os/LatePrintDocument";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

const KINDS: readonly CounselorReportKind[] = [
  "case",
  "holland",
  "worksheet",
  "konkur",
  "choices-initial",
  "choices-review",
  "choices-final",
  "summary",
];

type Props = { params: Promise<{ studentId: string; kind: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kind } = await params;
  return { title: kind === "holland" ? "گزارش کامل رغبت‌سنجی" : `گزارش ${kind}` };
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

  if (
    kind === "konkur" ||
    kind === "choices-initial" ||
    kind === "choices-review" ||
    kind === "choices-final" ||
    kind === "summary"
  ) {
    const late = await loadCounselorLateJourney(ctx, studentId);
    return (
      <LatePrintDocument
        kind={kind}
        caseModel={bundle.caseModel}
        dossier={bundle.dossier}
        late={late}
      />
    );
  }

  if (kind === "holland") {
    const report = buildHollandFullPrintReport({
      caseModel: bundle.caseModel,
      dossier: bundle.dossier,
    });
    const holland = report.holland;

    return (
      <div className="counselor-report counselor-holland-report" dir="rtl">
        <header className="counselor-report__letterhead">
          <div>
            <p className="counselor-report__brand">{report.brand.institute}</p>
            <p>{report.brand.partner}</p>
            <p>مشاور مسئول: {report.brand.counselor}</p>
          </div>
        </header>
        <h1>{report.title}</h1>
        <p className="counselor-report__meta">{report.subtitle}</p>
        <p className="counselor-report__meta">
          {report.studentName} · تولید: {report.generatedAtLabel}
        </p>
        <p className="counselor-report__hint">
          دکمه زیر پنجره چاپ را باز می‌کند. مقصد را «Save as PDF / ذخیره به‌صورت PDF» بگذارید، کاغذ A4 و حاشیه‌ها را پیش‌فرض نگه دارید.
        </p>
        <WorkspacePrintButton />

        <section className="counselor-report__step">
          <h2>هویت دانش‌آموز</h2>
          <table className="counselor-report__table">
            <tbody>
              {report.identity.map((row) => (
                <tr key={row.label}>
                  <th>{row.label}</th>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="counselor-report__step">
          <h2>اطلاعات مالی (تأثیری بر نمایش نتیجه ندارد)</h2>
          <table className="counselor-report__table">
            <tbody>
              {report.finance.map((row) => (
                <tr key={row.label}>
                  <th>{row.label}</th>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {!holland.completed ? (
          <section className="counselor-report__step">
            <h2>نتیجه رغبت‌سنجی</h2>
            <p>آزمون رغبت‌سنجی هنوز تکمیل نشده است.</p>
          </section>
        ) : (
          <>
            <section className="counselor-holland-report__code counselor-report__step">
              <h2>الگوی غالب</h2>
              <p className="counselor-holland-report__code-large" dir="ltr">
                {holland.code}
              </p>
              <ul>
                {holland.codeLetters.map((letter) => (
                  <li key={letter.type}>
                    {letter.type} — {letter.label}
                  </li>
                ))}
              </ul>
            </section>

            <section className="counselor-report__step">
              <h2>جدول شش بُعد</h2>
              <table className="counselor-report__table counselor-report__table--repeat">
                <thead>
                  <tr>
                    <th>رتبه</th>
                    <th>تیپ</th>
                    <th>کد</th>
                    <th>امتیاز خام</th>
                    <th>امتیاز نرمال‌شده</th>
                    <th>شدت</th>
                  </tr>
                </thead>
                <tbody>
                  {holland.scores.map((score) => (
                    <tr key={score.type}>
                      <td>{toPersianDigits(score.rank)}</td>
                      <td>{score.typeLabel}</td>
                      <td dir="ltr">{score.type}</td>
                      <td>{toPersianDigits(score.raw)}</td>
                      <td>{toPersianDigits(score.normalized)}٪</td>
                      <td>{score.intensity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="counselor-report__step">
              <h2>نمودار شش بُعد</h2>
              <HollandScoreChart scores={holland.scores} />
            </section>

            {holland.topThree.map((profile) => (
              <section key={profile.type} className="counselor-report__step">
                <h2>
                  تیپ غالب {toPersianDigits(profile.rank)}: {profile.title} ({profile.type})
                </h2>
                <p>{profile.summary}</p>
                <table className="counselor-report__table">
                  <tbody>
                    <tr>
                      <th>محیط مناسب</th>
                      <td>{profile.environment}</td>
                    </tr>
                    <tr>
                      <th>نقاط قوت</th>
                      <td>{profile.strengths.join("، ")}</td>
                    </tr>
                    <tr>
                      <th>نکات قابل بررسی</th>
                      <td>{profile.watchouts.join("، ")}</td>
                    </tr>
                    <tr>
                      <th>سبک یادگیری</th>
                      <td>{profile.studyStyle}</td>
                    </tr>
                    <tr>
                      <th>سبک کاری</th>
                      <td>{profile.workStyle}</td>
                    </tr>
                    <tr>
                      <th>حوزه‌های مرتبط</th>
                      <td>{profile.fields.join("، ")}</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            ))}

            {holland.combinedInterpretation ? (
              <section className="counselor-report__step">
                <h2>تفسیر آموزشی ترکیبی</h2>
                <p className="cos-holland-interpret">{holland.combinedInterpretation}</p>
              </section>
            ) : null}

            <section className="counselor-report__step counselor-report__step--flow">
              <h2>جزئیات پاسخ‌های دانش‌آموز</h2>
              {holland.answers.length === 0 ? (
                <p>پاسخ ذخیره‌شده‌ای موجود نیست.</p>
              ) : (
                <table className="counselor-report__table counselor-report__table--repeat">
                  <thead>
                    <tr>
                      <th>شماره</th>
                      <th>سؤال</th>
                      <th>بُعد</th>
                      <th>پاسخ</th>
                      <th>برچسب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holland.answers.map((row) => (
                      <tr key={row.number}>
                        <td>{toPersianDigits(row.number)}</td>
                        <td>{row.text}</td>
                        <td>
                          {row.typeLabel ? `${row.typeLabel} (${row.typeCode})` : "—"}
                        </td>
                        <td>{row.answer != null ? toPersianDigits(row.answer) : "—"}</td>
                        <td>{row.answerLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}

        <section className="counselor-report__step">
          <h2>یادداشت مشاور</h2>
          <div className="counselor-report__notespace counselor-report__notespace--large">
            <p>یادداشت مشاور:</p>
            <div className="counselor-report__lines counselor-report__lines--tall">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </section>

        <footer className="counselor-report__footer">
          <p>
            {report.brand.institute} · {report.brand.partner} · {report.brand.counselor}
          </p>
          <p>
            {report.studentName} · گزارش کامل رغبت‌سنجی · تاریخ تولید: {report.generatedAtLabel}
          </p>
        </footer>
      </div>
    );
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
