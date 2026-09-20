import { notFound } from "next/navigation";
import {
  CounselorNextActionSection,
  formatWaitingDaysLabel,
} from "@/components/counselor-os/CounselorNextActionSection";
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
import { loadCounselorCaseBundle } from "@/lib/counselor-os/students";
import { loadSteps1118WorkspaceModel } from "@/lib/counselor-os/steps-11-18-workspace";
import { loadStepReviewBoard } from "@/lib/guidance/journey-v2/step-review/service";
import type { Journey18ControlModel } from "@/components/counselor-os/CounselorJourney18Control";
import type { CounselorCaseNavTabId } from "@/lib/counselor-os/case-page-config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studentId: string }> };

function waitingDaysFromUpdatedAt(updatedAt: Date): number {
  return Math.floor((Date.now() - updatedAt.getTime()) / (24 * 60 * 60 * 1000));
}

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
  const [sessions, notes, corrections, followUps, counselors, steps1118, reviewFlag, studentRow, journey18Raw, hollandPlan] =
    await Promise.all([
      listStudentSessionHistory(ctx, studentId),
      listCounselorNotes(ctx, studentId),
      listCounselorCorrections(ctx, studentId),
      listStudentFollowUps(ctx, studentId),
      ctx.isSupervisor ? listOrgCounselorsForSelect(ctx) : Promise.resolve([]),
      loadSteps1118WorkspaceModel(ctx, studentId),
      prisma.guidancePlan.findFirst({
        where: {
          organizationId: ctx.organizationId,
          studentId,
          deletedAt: null,
          v2NeedsReviewAt: { not: null },
        },
        select: { v2NeedsReviewStep: true },
      }),
      prisma.student.findFirst({
        where: { id: studentId, organizationId: ctx.organizationId },
        select: { updatedAt: true },
      }),
      loadStepReviewBoard({ organizationId: ctx.organizationId, studentId }).catch(() => null),
      prisma.guidancePlan.findFirst({
        where: {
          organizationId: ctx.organizationId,
          studentId,
          deletedAt: null,
          journeyVersion: 2,
        },
        select: { v2HollandRetakePending: true },
      }),
    ]);

  const journey18: Journey18ControlModel | null = journey18Raw
    ? {
        studentId,
        publicId: journey18Raw.publicId,
        planId: journey18Raw.planId,
        currentStep: journey18Raw.currentStep,
        steps: journey18Raw.steps,
        hollandRetakePending: hollandPlan?.v2HollandRetakePending ?? false,
      }
    : null;

  const waitingDaysLabel = studentRow
    ? formatWaitingDaysLabel(waitingDaysFromUpdatedAt(studentRow.updatedAt))
    : null;

  const defaultTab: CounselorCaseNavTabId =
    caseModel.currentStep != null && caseModel.currentStep >= 11 ? "late" : "overview";

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

      <CounselorNextActionSection
        view={steps1118.nextAction}
        waitingDaysLabel={waitingDaysLabel}
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
        steps1118={steps1118}
        journey18={journey18}
        defaultTab={defaultTab}
      />
    </div>
  );
}
