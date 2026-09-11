import { GUIDANCE_CANONICAL_HOME } from "@/lib/guidance/canonical-entry";
import { APPOINTMENT_PURPOSE, CHOICE_LIST_KIND } from "@/lib/guidance/journey-v2/constants";
import { loadPurposeAppointmentView, loadAssignedCounselorForStudent } from "@/lib/guidance/journey-v2/appointments";
import { loadChoiceListView } from "@/lib/guidance/journey-v2/choices";
import { loadKonkurCaseView } from "@/lib/guidance/journey-v2/konkur";
import { labelSanjeshStatus } from "@/lib/guidance/journey-v2/labels";
import type { GuidanceV2PlanSnapshot } from "@/lib/guidance/journey-v2/plan";
import { loadSanjeshCase } from "@/lib/guidance/journey-v2/sanjesh";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";

export async function loadJourneyCompletionSummary(params: {
  organizationId: string;
  studentId: string;
  plan: GuidanceV2PlanSnapshot;
}) {
  const [counselor, first, second, finalList, konkur, sanjesh] = await Promise.all([
    loadAssignedCounselorForStudent(params),
    loadPurposeAppointmentView({
      organizationId: params.organizationId,
      studentId: params.studentId,
      purpose: APPOINTMENT_PURPOSE.FIRST_SESSION,
    }),
    loadPurposeAppointmentView({
      organizationId: params.organizationId,
      studentId: params.studentId,
      purpose: APPOINTMENT_PURPOSE.SECOND_SESSION,
    }),
    loadChoiceListView({
      organizationId: params.organizationId,
      planId: params.plan.id,
      kind: CHOICE_LIST_KIND.FINAL,
    }),
    loadKonkurCaseView({
      organizationId: params.organizationId,
      studentId: params.studentId,
      planPublicId: params.plan.publicId,
      planId: params.plan.id,
      planExamGroup: params.plan.examGroup,
    }),
    loadSanjeshCase({
      organizationId: params.organizationId,
      planId: params.plan.id,
    }),
  ]);

  return {
    dashboardHref: GUIDANCE_CANONICAL_HOME,
    counselorName: counselor?.name ?? "—",
    packageCode: params.plan.guidancePackageCode ?? "—",
    firstSession: first?.whenLabel ?? "—",
    secondSession: second?.whenLabel ?? "—",
    finalChoiceCount: finalList?.items.filter((i) => i.isActive).length ?? 0,
    confirmedAtLabel: params.plan.finalApprovedAtIso
      ? formatJalaliDateTimeShort(new Date(params.plan.finalApprovedAtIso))
      : "—",
    sanjeshStatusLabel: labelSanjeshStatus(params.plan.v2SanjeshStatus),
    konkurYear: konkur.studentData?.examYear ?? "—",
    receiptFilename: sanjesh.receipt?.filename ?? null,
  };
}
