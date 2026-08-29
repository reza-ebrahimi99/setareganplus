/**
 * Guidance Journey Engine — step dispatcher (Phase 1).
 * Enforces the step lock server-side, then renders the matching step screen.
 * `[step]` is parsed and validated — never trusted for authorization.
 */

import { notFound } from "next/navigation";
import { GuidanceStepPlaceholder } from "@/components/guidance/steps/GuidanceStepPlaceholder";
import { PersonalInfoStep } from "@/components/guidance/steps/step1/PersonalInfoStep";
import { requireGuidanceJourneyStepAccess } from "@/lib/guidance/journey/guard";
import { buildGuidanceJourneySidebar } from "@/lib/guidance/journey/state";
import {
  getGuidanceJourneyStepDefinition,
  parseGuidanceJourneyStepParam,
} from "@/lib/guidance/journey/steps";
import { loadStep1Prefill } from "@/lib/guidance/journey/steps/step1-personal-info";
import { IRAN_PROVINCES } from "@/lib/registration/iran-locations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ step: string }>;
};

export default async function GuidanceJourneyStepPage({ params }: PageProps) {
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

  const definition = getGuidanceJourneyStepDefinition(stepId);
  return (
    <GuidanceStepPlaceholder
      step={definition}
      sidebarSteps={sidebarSteps}
      completionPercentage={plan.completionPercentage}
    />
  );
}
