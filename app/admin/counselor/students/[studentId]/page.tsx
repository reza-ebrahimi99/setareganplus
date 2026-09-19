import { notFound } from "next/navigation";
import { CounselorStudentCaseActions } from "@/components/counselor-os/CounselorStudentCaseActions";
import { CounselorStudentCaseAlerts } from "@/components/counselor-os/CounselorStudentCaseAlerts";
import { CounselorStudentCaseHeader } from "@/components/counselor-os/CounselorStudentCaseHeader";
import { CounselorStudentCaseTabs } from "@/components/counselor-os/CounselorStudentCaseTabs";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { listOrgCounselorsForSelect } from "@/lib/counselor-os/assignments";
import { listCounselorCorrections } from "@/lib/counselor-os/corrections";
import { listStudentFollowUps } from "@/lib/counselor-os/follow-ups";
import { listCounselorNotes } from "@/lib/counselor-os/notes";
import { listStudentSessionHistory } from "@/lib/counselor-os/sessions";
import { loadCounselorLateJourney } from "@/lib/counselor-os/late-journey";
import { loadCounselorCaseBundle } from "@/lib/counselor-os/students";
import { prisma } from "@/lib/prisma";

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
  const [sessions, notes, corrections, followUps, counselors, lateJourney, reviewFlag] =
    await Promise.all([
      listStudentSessionHistory(ctx, studentId),
      listCounselorNotes(ctx, studentId),
      listCounselorCorrections(ctx, studentId),
      listStudentFollowUps(ctx, studentId),
      ctx.isSupervisor ? listOrgCounselorsForSelect(ctx) : Promise.resolve([]),
      loadCounselorLateJourney(ctx, studentId),
      prisma.guidancePlan.findFirst({
        where: {
          organizationId: ctx.organizationId,
          studentId,
          deletedAt: null,
          v2NeedsReviewAt: { not: null },
        },
        select: { v2NeedsReviewStep: true },
      }),
    ]);

  return (
    <div className="cos-page cos-case-page">
      <CounselorStudentCaseHeader
        caseModel={caseModel}
        packageTitle={dossier.finance.packageTitle}
        packageStateLabel={dossier.finance.packageStateLabel}
      />

      <CounselorStudentCaseAlerts
        alerts={caseModel.alerts}
        needsReview={reviewFlag ? { step: reviewFlag.v2NeedsReviewStep } : null}
      />

      <CounselorStudentCaseActions studentId={studentId} />

      <CounselorStudentCaseTabs
        caseModel={caseModel}
        dossier={dossier}
        sessions={sessions}
        notes={notes}
        corrections={corrections}
        followUps={followUps}
        isSupervisor={ctx.isSupervisor}
        counselors={counselors}
        lateJourney={lateJourney}
      />
    </div>
  );
}
