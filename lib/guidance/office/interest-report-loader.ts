/**
 * Office interest results — GuidancePlan + student + QR. No new tables.
 */

import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { formatJalaliDateLong } from "@/lib/datetime/jalali";
import {
  buildAssessmentDashboard,
  isAssessmentComplete,
} from "@/lib/guidance/journey/assessment/scoring";
import { loadGuidanceStep2Session } from "@/lib/guidance/journey/steps/step2-interest-assessment";
import { workspaceExamGroupLabel } from "@/lib/guidance/workspace/presentation";
import {
  INTEREST_CONSULTATION,
  buildInterestReportIdentity,
  buildTopMajorMatches,
  interestReportQrPayload,
  type InterestResultsView,
} from "@/lib/guidance/office/interest-report";
import type { GuidanceJourneyPlanSnapshot } from "@/lib/guidance/journey/types";

export async function loadOfficeInterestResults(params: {
  organizationId: string;
  plan: GuidanceJourneyPlanSnapshot;
}): Promise<InterestResultsView | null> {
  const session = await loadGuidanceStep2Session({
    organizationId: params.organizationId,
    planPublicId: params.plan.publicId,
  });
  if (!session.result || !isAssessmentComplete(session.answers)) {
    return null;
  }

  const student = await prisma.student.findFirst({
    where: {
      id: params.plan.studentId,
      organizationId: params.organizationId,
    },
    select: { fullName: true, firstName: true, lastName: true },
  });

  const dashboard = buildAssessmentDashboard(session.answers, session.result);
  const completedAt = session.result.completedAtIso;
  const identity = buildInterestReportIdentity({
    studentName:
      student?.fullName.trim() ||
      `${student?.firstName ?? ""} ${student?.lastName ?? ""}`.trim() ||
      "دانش‌آموز",
    examGroupLabel: workspaceExamGroupLabel(params.plan.examGroup),
    assessmentDateLabel: formatJalaliDateLong(new Date(completedAt)),
    planPublicId: params.plan.publicId,
    completedAtIso: completedAt,
  });

  const qrDataUrl = await QRCode.toDataURL(
    interestReportQrPayload(identity.reportId),
    { margin: 1, width: 160, errorCorrectionLevel: "M" },
  );

  return {
    dashboard,
    identity,
    qrDataUrl,
    topMatches: buildTopMajorMatches(dashboard.suggestedMajors, 3),
    consultation: INTEREST_CONSULTATION,
    disclaimer: dashboard.disclaimer,
  };
}
