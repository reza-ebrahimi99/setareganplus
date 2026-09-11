import Link from "next/link";
import { notFound } from "next/navigation";
import { CounselorStudentCaseTabs } from "@/components/counselor-os/CounselorStudentCaseTabs";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { listCounselorNotes } from "@/lib/counselor-os/notes";
import { listStudentSessionHistory } from "@/lib/counselor-os/sessions";
import { loadCounselorStudentCase } from "@/lib/counselor-os/students";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studentId: string }> };

export default async function CounselorStudentCasePage({ params }: Props) {
  const { studentId } = await params;
  const ctx = await requireCounselorContext();

  let caseModel;
  try {
    caseModel = await loadCounselorStudentCase(ctx, studentId);
  } catch {
    notFound();
  }

  const [sessions, notes] = await Promise.all([
    listStudentSessionHistory(ctx, studentId),
    listCounselorNotes(ctx, studentId),
  ]);

  return (
    <div className="cos-page">
      <header className="cos-case-hero">
        <div>
          <p className="cos-page__eyebrow">پرونده دانش‌آموز</p>
          <h1>{caseModel.studentName}</h1>
          <p className="cos-page__lead">
            {caseModel.gradeName ?? "—"}
            {caseModel.examGroup ? ` · ${caseModel.examGroup}` : ""}
            {caseModel.mobile ? ` · ${caseModel.mobile}` : ""}
          </p>
        </div>
        <div className="cos-case-hero__stats">
          <div>
            <span>مرحله فعال</span>
            <strong>{caseModel.currentStepTitle ?? "—"}</strong>
          </div>
          <div>
            <span>پیشرفت</span>
            <strong>
              {caseModel.completionPercentage != null
                ? `${toPersianDigits(caseModel.completionPercentage)}٪`
                : "—"}
            </strong>
          </div>
          <div>
            <span>جلسه بعدی</span>
            <strong>{caseModel.nextAppointment?.label ?? "—"}</strong>
          </div>
        </div>
      </header>

      {caseModel.alerts.length > 0 ? (
        <ul className="cos-alerts">
          {caseModel.alerts.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      ) : null}

      {caseModel.planPublicId ? (
        <p className="cos-case-links">
          <Link href={`/admin/guidance/${caseModel.planPublicId}`}>
            میز کار پرونده (جزئیات گام‌ها)
          </Link>
        </p>
      ) : null}

      <CounselorStudentCaseTabs
        caseModel={caseModel}
        sessions={sessions}
        notes={notes}
      />
    </div>
  );
}
