/**
 * Guidance Journey Engine — step dispatcher (Phase 1).
 * Enforces the step lock server-side, then renders the matching step screen.
 * `[step]` is parsed and validated — never trusted for authorization.
 */

import { notFound } from "next/navigation";
import { PersonalInfoStep } from "@/components/guidance/steps/step1/PersonalInfoStep";
import { InterestAssessmentStep } from "@/components/guidance/steps/step2/InterestAssessmentStep";
import { RegistrationPaymentStep } from "@/components/guidance/steps/step3/RegistrationPaymentStep";
import {
  FirstSessionStep,
  type FirstSessionSlotView,
} from "@/components/guidance/steps/step4/FirstSessionStep";
import { ExamResultsStep } from "@/components/guidance/steps/step5/ExamResultsStep";
import { EducationPreferencesStep } from "@/components/guidance/steps/step6/EducationPreferencesStep";
import { CityPreferencesStep } from "@/components/guidance/steps/step7/CityPreferencesStep";
import { MajorPreferencesStep } from "@/components/guidance/steps/step8/MajorPreferencesStep";
import { PriorityWeightsStep } from "@/components/guidance/steps/step9/PriorityWeightsStep";
import { AiArrangementStep } from "@/components/guidance/steps/step10/AiArrangementStep";
import {
  SecondSessionStep,
  type SecondSessionSlotView,
} from "@/components/guidance/steps/step11/SecondSessionStep";
import { FinalApprovalStep } from "@/components/guidance/steps/step12/FinalApprovalStep";
import { requireGuidanceJourneyStepAccess } from "@/lib/guidance/journey/guard";
import { buildGuidanceJourneySidebar } from "@/lib/guidance/journey/state";
import { parseGuidanceJourneyStepParam } from "@/lib/guidance/journey/steps";
import { loadStep1Prefill } from "@/lib/guidance/journey/steps/step1-personal-info";
import { loadGuidanceStep2Session } from "@/lib/guidance/journey/steps/step2-interest-assessment";
import { loadStep5Prefill } from "@/lib/guidance/journey/steps/step5-exam-results";
import { loadStep6Data } from "@/lib/guidance/journey/steps/step6-education-preferences";
import { loadStep7Data } from "@/lib/guidance/journey/steps/step7-city-preferences";
import { loadStep8Data } from "@/lib/guidance/journey/steps/step8-major-preferences";
import { loadStep9Data } from "@/lib/guidance/journey/steps/step9-priority-weights";
import { loadGuidanceStep10Data } from "@/lib/guidance/journey/steps/step10-ai-arrangement";
import { loadGuidanceBookableSlots } from "@/lib/guidance/journey/booking";
import {
  GUIDANCE_EXAM_GROUP_LABELS,
  getMajorsForExamGroup,
} from "@/lib/guidance/journey/reference-data/majors";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { IRAN_PROVINCES } from "@/lib/registration/iran-locations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ step: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GuidanceJourneyStepPage({
  params,
  searchParams,
}: PageProps) {
  const { step: rawStep } = await params;
  const stepId = parseGuidanceJourneyStepParam(rawStep);
  if (!stepId) {
    notFound();
  }

  const { context, plan } = await requireGuidanceJourneyStepAccess(stepId);
  const sidebarSteps = buildGuidanceJourneySidebar(plan);

  if (stepId === 1) {
    const [student, transcript, prefill] = await Promise.all([
      prisma.student.findFirst({
        where: { id: plan.studentId, organizationId: context.organization.id },
        select: { fullName: true },
      }),
      prisma.guidanceDocument.findFirst({
        where: {
          organizationId: context.organization.id,
          planId: plan.id,
          documentType: "FINAL_GRADES",
          isLatest: true,
          deletedAt: null,
        },
        select: { originalFilename: true },
      }),
      loadStep1Prefill({
        organizationId: context.organization.id,
        planPublicId: plan.publicId,
      }),
    ]);

    return (
      <PersonalInfoStep
        sidebarSteps={sidebarSteps}
        completionPercentage={plan.completionPercentage}
        fullName={student?.fullName ?? ""}
        examGroup={plan.examGroup}
        hasTranscript={Boolean(transcript)}
        existingTranscriptName={transcript?.originalFilename ?? null}
        provinces={IRAN_PROVINCES}
        prefill={{
          nationalId: prefill.nationalId ?? "",
          gender: (prefill.gender as "MALE" | "FEMALE" | undefined) ?? "",
          birthDate: prefill.birthDate ?? "",
          province: prefill.province ?? "",
        }}
      />
    );
  }

  if (stepId === 2) {
    const session = await loadGuidanceStep2Session({
      organizationId: context.organization.id,
      planPublicId: plan.publicId,
    });

    return (
      <InterestAssessmentStep
        sidebarSteps={sidebarSteps}
        completionPercentage={plan.completionPercentage}
        initialAnswers={session.answers}
      />
    );
  }

  if (stepId === 3) {
    const query = await searchParams;
    const paymentError = query.paymentError;
    return (
      <RegistrationPaymentStep
        sidebarSteps={sidebarSteps}
        completionPercentage={plan.completionPercentage}
        paymentError={
          Array.isArray(paymentError) ? paymentError[0] ?? null : paymentError ?? null
        }
      />
    );
  }

  if (stepId === 4) {
    const view = await loadGuidanceBookableSlots({
      organizationId: context.organization.id,
      sessionNumber: 1,
    });
    const slots: FirstSessionSlotView[] = view.slots.map((slot) => ({
      id: slot.id,
      label: formatJalaliDateTimeShort(new Date(slot.startsAtIso)),
      advisorName: slot.advisorName,
      remainingCapacity: slot.remainingCapacity,
    }));

    return (
      <FirstSessionStep
        sidebarSteps={sidebarSteps}
        completionPercentage={plan.completionPercentage}
        configured={view.configured}
        slots={slots}
      />
    );
  }

  if (stepId === 5) {
    const [prefill, examDoc] = await Promise.all([
      loadStep5Prefill({
        organizationId: context.organization.id,
        planPublicId: plan.publicId,
      }),
      prisma.guidanceDocument.findFirst({
        where: {
          organizationId: context.organization.id,
          planId: plan.id,
          documentType: "EXAM_RESULT",
          isLatest: true,
          deletedAt: null,
        },
        select: { originalFilename: true },
      }),
    ]);

    return (
      <ExamResultsStep
        sidebarSteps={sidebarSteps}
        completionPercentage={plan.completionPercentage}
        hasDocument={Boolean(examDoc)}
        existingFileName={examDoc?.originalFilename ?? null}
        prefill={{
          nationalRank: prefill?.nationalRank ? String(prefill.nationalRank) : "",
          regionalRank: prefill?.regionalRank ? String(prefill.regionalRank) : "",
          quotaRank: prefill?.quotaRank ? String(prefill.quotaRank) : "",
          score: prefill?.score ? String(prefill.score) : "",
        }}
      />
    );
  }

  if (stepId === 6) {
    const step6 = await loadStep6Data({
      organizationId: context.organization.id,
      planPublicId: plan.publicId,
    });
    return (
      <EducationPreferencesStep
        sidebarSteps={sidebarSteps}
        completionPercentage={plan.completionPercentage}
        initialItems={step6.items}
      />
    );
  }

  if (stepId === 7) {
    const step1 = await loadStep1Prefill({
      organizationId: context.organization.id,
      planPublicId: plan.publicId,
    });
    const step7 = await loadStep7Data({
      organizationId: context.organization.id,
      planPublicId: plan.publicId,
      homeProvince: step1.province ?? null,
    });
    return (
      <CityPreferencesStep
        sidebarSteps={sidebarSteps}
        completionPercentage={plan.completionPercentage}
        allProvinces={IRAN_PROVINCES}
        initialItems={step7.items}
      />
    );
  }

  if (stepId === 8) {
    const step8 = await loadStep8Data({
      organizationId: context.organization.id,
      planPublicId: plan.publicId,
      examGroup: plan.examGroup,
    });
    const majorLabels = Object.fromEntries(
      getMajorsForExamGroup(plan.examGroup).map((m) => [m.code, m.label]),
    );
    return (
      <MajorPreferencesStep
        sidebarSteps={sidebarSteps}
        completionPercentage={plan.completionPercentage}
        initialItems={step8.items}
        majorLabels={majorLabels}
        examGroupLabel={GUIDANCE_EXAM_GROUP_LABELS[plan.examGroup]}
      />
    );
  }

  if (stepId === 9) {
    const step9 = await loadStep9Data({
      organizationId: context.organization.id,
      planPublicId: plan.publicId,
    });
    return (
      <PriorityWeightsStep
        sidebarSteps={sidebarSteps}
        completionPercentage={plan.completionPercentage}
        initialOrderedCodes={step9.orderedCodes}
      />
    );
  }

  if (stepId === 10) {
    const step10 = await loadGuidanceStep10Data({
      organizationId: context.organization.id,
      planPublicId: plan.publicId,
    });
    return (
      <AiArrangementStep
        sidebarSteps={sidebarSteps}
        completionPercentage={plan.completionPercentage}
        approved={Boolean(plan.choicesApprovedAtIso)}
        choices={step10.choices}
      />
    );
  }

  if (stepId === 11) {
    const view = await loadGuidanceBookableSlots({
      organizationId: context.organization.id,
      sessionNumber: 2,
    });
    const slots: SecondSessionSlotView[] = view.slots.map((slot) => ({
      id: slot.id,
      label: formatJalaliDateTimeShort(new Date(slot.startsAtIso)),
      advisorName: slot.advisorName,
      remainingCapacity: slot.remainingCapacity,
    }));

    return (
      <SecondSessionStep
        sidebarSteps={sidebarSteps}
        completionPercentage={plan.completionPercentage}
        configured={view.configured}
        slots={slots}
      />
    );
  }

  // stepId === 12 (exhaustive: parseGuidanceJourneyStepParam only returns 1-12)
  const student = await prisma.student.findFirst({
    where: { id: plan.studentId, organizationId: context.organization.id },
    select: { fullName: true },
  });

  return (
    <FinalApprovalStep
      sidebarSteps={sidebarSteps}
      completionPercentage={plan.completionPercentage}
      fullName={student?.fullName ?? ""}
      planPublicId={plan.publicId}
      examGroupLabel={GUIDANCE_EXAM_GROUP_LABELS[plan.examGroup]}
      alreadyApproved={Boolean(plan.finalApprovedAtIso)}
      approvedAtIso={plan.finalApprovedAtIso}
    />
  );
}
