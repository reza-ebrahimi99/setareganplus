import { notFound } from "next/navigation";
import { CounselorStudentCaseTabs } from "@/components/counselor-os/CounselorStudentCaseTabs";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { listOrgCounselorsForSelect } from "@/lib/counselor-os/assignments";
import { listCounselorCorrections } from "@/lib/counselor-os/corrections";
import { listStudentFollowUps } from "@/lib/counselor-os/follow-ups";
import { listCounselorNotes } from "@/lib/counselor-os/notes";
import { listStudentSessionHistory } from "@/lib/counselor-os/sessions";
import { loadCounselorCaseBundle } from "@/lib/counselor-os/students";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studentId: string }> };

export default async function CounselorStudentCasePage({ params }: Props) {
  const { studentId } = await params;
  const ctx = await requireCounselorContext();

  let bundle;
  try {
    bundle = await loadCounselorCaseBundle(ctx, studentId);
  } catch {
    notFound();
  }

  const { caseModel, dossier } = bundle;
  const [sessions, notes, corrections, followUps, counselors] = await Promise.all([
    listStudentSessionHistory(ctx, studentId),
    listCounselorNotes(ctx, studentId),
    listCounselorCorrections(ctx, studentId),
    listStudentFollowUps(ctx, studentId),
    ctx.isSupervisor ? listOrgCounselorsForSelect(ctx) : Promise.resolve([]),
  ]);

  return (
    <div className="cos-page">
      <header className="cos-case-hero">
        <div>
          <p className="cos-page__eyebrow">پرونده کامل دانش‌آموز</p>
          <h1>{caseModel.studentName}</h1>
          <p className="cos-page__lead">
            {[caseModel.gradeName, caseModel.examGroupLabel, caseModel.mobile, caseModel.province]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="cos-case-hero__stats">
          <div>
            <span>مرحله جاری</span>
            <strong>{caseModel.currentStepTitle ?? "شروع نشده"}</strong>
          </div>
          <div>
            <span>پیشرفت</span>
            <strong>{toPersianDigits(caseModel.completionPercentage)}٪</strong>
          </div>
          <div>
            <span>وضعیت</span>
            <strong>{caseModel.studentStatusLabel}</strong>
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

      <CounselorStudentCaseTabs
        caseModel={caseModel}
        dossier={dossier}
        sessions={sessions}
        notes={notes}
        corrections={corrections}
        followUps={followUps}
        isSupervisor={ctx.isSupervisor}
        counselors={counselors}
      />
    </div>
  );
}
