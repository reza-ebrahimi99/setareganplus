/**
 * Guidance Journey Engine — step dispatcher (Phase 1).
 * Enforces the step lock server-side, then renders the matching step screen.
 * `[step]` is parsed and validated — never trusted for authorization.
 */

import { notFound } from "next/navigation";
import { GuidanceStepPlaceholder } from "@/components/guidance/steps/GuidanceStepPlaceholder";
import { PersonalInfoStep } from "@/components/guidance/steps/step1/PersonalInfoStep";
import { InterestAssessmentStep } from "@/components/guidance/steps/step2/InterestAssessmentStep";
import { RegistrationPaymentStep } from "@/components/guidance/steps/step3/RegistrationPaymentStep";
import {
  FirstSessionStep,
  type FirstSessionSlotView,
} from "@/components/guidance/steps/step4/FirstSessionStep";
import { ExamResultsStep } from "@/components/guidance/steps/step5/ExamResultsStep";
import { requireGuidanceJourneyStepAccess } from "@/lib/guidance/journey/guard";
import { buildGuidanceJourneySidebar } from "@/lib/guidance/journey/state";
import {
  getGuidanceJourneyStepDefinition,
  parseGuidanceJourneyStepParam,
} from "@/lib/guidance/journey/steps";
import { loadStep1Prefill } from "@/lib/guidance/journey/steps/step1-personal-info";
import { loadGuidanceStep2Session } from "@/lib/guidance/journey/steps/step2-interest-assessment";
import { loadStep5Prefill } from "@/lib/guidance/journey/steps/step5-exam-results";
import { loadGuidanceBookableSlots } from "@/lib/guidance/journey/booking";
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

  const definition = getGuidanceJourneyStepDefinition(stepId);
  return (
    <GuidanceStepPlaceholder
      step={definition}
      sidebarSteps={sidebarSteps}
      completionPercentage={plan.completionPercentage}
    />
  );
}
