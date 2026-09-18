import { notFound } from "next/navigation";

import { PersonalInfoV2Step } from "@/components/guidance/journey-v2/PersonalInfoV2Step";
import { ExamGroupsV2Step } from "@/components/guidance/journey-v2/ExamGroupsV2Step";
import { FinalGradesV2Step } from "@/components/guidance/journey-v2/FinalGradesV2Step";

import { GuidanceDocumentType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { IRAN_PROVINCES } from "@/lib/registration/iran-locations";

import { requireGuidanceV2StepAccess } from "@/lib/guidance/journey-v2/guard";
import { buildGuidanceJourneyV2Sidebar } from "@/lib/guidance/journey-v2/state";
import { loadGuidanceStepData } from "@/lib/guidance/journey/step-store";
import { loadLatestGuidanceDocument } from "@/lib/guidance/journey-v2/documents";

import {
  type GuidanceV2Step1Validated,
} from "@/lib/guidance/journey-v2/steps/step1-validation";
import { loadGuidanceV2Step2 } from "@/lib/guidance/journey-v2/steps/step2-exam-groups";

import { loadFinalExamScores } from "@/lib/guidance/office/final-exam-store";
import { subjectsForExamGroup } from "@/lib/guidance/office/final-exam";

import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ step: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function validateStoredStep1(data: unknown): GuidanceV2Step1Validated | null {
  if (!data || typeof data !== "object") return null;

  const value = data as Partial<GuidanceV2Step1Validated>;

  if (
    typeof value.firstName !== "string" ||
    typeof value.lastName !== "string" ||
    typeof value.nationalId !== "string" ||
    typeof value.gender !== "string" ||
    typeof value.birthDateJalali !== "string" ||
    typeof value.nativeProvince !== "string" ||
    typeof value.regionQuota !== "string" ||
    typeof value.specialQuota !== "string" ||
    typeof value.highSchoolAverage !== "number"
  ) {
    return null;
  }

  return value as GuidanceV2Step1Validated;
}

export default async function GuidanceV2EarlyStepPage(props: Props) {
  const { params } = props;
  const { step: raw } = await params;
  const stepId = Number(raw);

  if (stepId < 1 || stepId > 10) notFound();

  const { context, plan } = await requireGuidanceV2StepAccess(
    stepId as import("@/lib/guidance/journey-v2/catalog").GuidanceV2StepId,
  );

  const sidebar =
    buildGuidanceJourneyV2Sidebar(plan) as unknown as GuidanceJourneySidebarStep[];

  if (stepId >= 4) {
    const middle = await import("./page.middle-4-10");

    return middle.default({
      sidebar,
      params: props.params,
      searchParams: (
        "searchParams" in props
          ? (props as Props & {
              searchParams?: Promise<{
                payment?: string | string[];
              }>;
            }).searchParams
          : Promise.resolve({})
      ),
    });
  }


  if (stepId === 1) {
    const [stored, student] = await Promise.all([
      loadGuidanceStepData<GuidanceV2Step1Validated>({
        organizationId: context.organization.id,
        category: "guidance-journey-v2-step1",
        kind: "guidance-journey-v2-step1",
        planPublicId: plan.publicId,
        validate: validateStoredStep1,
      }),
      prisma.student.findFirst({
        where: {
          id: plan.studentId,
          organizationId: context.organization.id,
        },
        select: {
          firstName: true,
          lastName: true,
        },
      }),
    ]);

    const data = stored.data;

    return (
      <PersonalInfoV2Step
        sidebarSteps={sidebar}
        completionPercentage={plan.completionPercentage}
        mobile={context.user.mobile ?? ""}
        provinces={IRAN_PROVINCES}
        prefill={{
          firstName: data?.firstName ?? student?.firstName ?? context.user.firstName ?? "",
          lastName: data?.lastName ?? student?.lastName ?? context.user.lastName ?? "",
          nationalId: data?.nationalId ?? "",
          gender: data?.gender ?? "",
          birthDateJalali: data?.birthDateJalali ?? "",
          nativeProvince: data?.nativeProvince ?? "",
          regionQuota: data?.regionQuota ?? "",
          specialQuota: data?.specialQuota ?? "NORMAL",
          highSchoolAverage:
            data?.highSchoolAverage != null ? String(data.highSchoolAverage) : "",
          alternateMobile: data?.alternateMobile ?? "",
        }}
      />
    );
  }

  if (stepId === 2) {
    const stored = await loadGuidanceV2Step2({
      organizationId: context.organization.id,
      planPublicId: plan.publicId,
      fallbackPrimary: plan.examGroup,
    });

    return (
      <ExamGroupsV2Step
        sidebarSteps={sidebar}
        completionPercentage={plan.completionPercentage}
        initialPrimary={
          stored.data?.primary ??
          (plan.examGroup === "MATHEMATICS" ||
          plan.examGroup === "EXPERIMENTAL_SCIENCES" ||
          plan.examGroup === "HUMANITIES"
            ? plan.examGroup
            : "")
        }
        initialSecondary={stored.data?.secondary ?? []}
      />
    );
  }

  const [gradeData, document] = await Promise.all([
    loadFinalExamScores({
      organizationId: context.organization.id,
      planPublicId: plan.publicId,
      examGroup: plan.examGroup,
    }),
    loadLatestGuidanceDocument({
      organizationId: context.organization.id,
      planId: plan.id,
      documentType: GuidanceDocumentType.FINAL_GRADES,
    }),
  ]);

  return (
    <FinalGradesV2Step
      sidebarSteps={sidebar}
      completionPercentage={plan.completionPercentage}
      subjects={subjectsForExamGroup(plan.examGroup)}
      scores={gradeData.scores}
      existingTranscriptName={document?.originalFilename ?? null}
    />
  );
}
