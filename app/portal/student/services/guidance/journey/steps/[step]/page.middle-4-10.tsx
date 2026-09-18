import { notFound, redirect } from "next/navigation";

import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

import { HollandV2Step } from "@/components/guidance/journey-v2/HollandV2Step";
import { AssessmentResultV2Step } from "@/components/guidance/journey-v2/AssessmentResultV2Step";
import { EducationPreferencesV2Step } from "@/components/guidance/journey-v2/EducationPreferencesV2Step";
import { CityPreferencesV2Step } from "@/components/guidance/journey-v2/CityPreferencesV2Step";
import { MajorPreferencesV2Step } from "@/components/guidance/journey-v2/MajorPreferencesV2Step";
import { PriorityFactorsV2Step } from "@/components/guidance/journey-v2/PriorityFactorsV2Step";
import { PackagePaymentV2Step } from "@/components/guidance/journey-v2/PackagePaymentV2Step";

import {
  loadGuidanceV2Step4Answers,
} from "@/app/portal/student/services/guidance/journey/steps/actions/step4";

import {
  computeAssessmentResult,
  isAssessmentComplete,
} from "@/lib/guidance/journey/assessment/scoring";

import {
  loadGuidanceV2Step6,
} from "@/lib/guidance/journey-v2/steps/step6-education-preferences";

import {
  loadGuidanceV2Step7,
} from "@/lib/guidance/journey-v2/steps/step7-city-preferences";

import {
  loadGuidanceV2Step8,
} from "@/lib/guidance/journey-v2/steps/step8-major-preferences";

import {
  loadGuidanceV2Step9,
  GUIDANCE_V2_PRIORITY_FACTORS,
} from "@/lib/guidance/journey-v2/steps/step9-priority-factors";

import {
  loadGuidanceV2Step2,
} from "@/lib/guidance/journey-v2/steps/step2-exam-groups";

import {
  GUIDANCE_V2_PACKAGES,
} from "@/lib/guidance/journey-v2/steps/step10-packages";

import {
  guidanceJourneyV2StepPath,
} from "@/lib/guidance/journey-v2/catalog";

import {
  requireGuidanceV2StepAccess,
} from "@/lib/guidance/journey-v2/guard";

import {
  getMajorsForExamGroup,
} from "@/lib/guidance/journey/reference-data/majors";

import {
  IRAN_PROVINCES,
} from "@/lib/registration/iran-locations";

type Props = {
  sidebar: readonly GuidanceJourneySidebarStep[];
  params: Promise<{ step: string }>;
  searchParams?: Promise<{ payment?: string | string[] }>;
};

export default async function GuidanceMiddleStepPage(props: Props) {
  const { step: raw } = await props.params;
  const stepId = Number(raw);

  if (!Number.isInteger(stepId) || stepId < 4 || stepId > 10) {
    notFound();
  }

  const { sidebar } = props;

  const { context, plan } =
    await requireGuidanceV2StepAccess(
      stepId as 4 | 5 | 6 | 7 | 8 | 9 | 10,
    );

  if (stepId === 4) {
    let initialAnswers = {};

    try {
      initialAnswers = await loadGuidanceV2Step4Answers();
    } catch (error) {
      console.error("[guidance-v2] step4_load_answers_failed", error);
    }

    return (
      <HollandV2Step
        sidebarSteps={sidebar}
        completionPercentage={plan.completionPercentage}
        initialAnswers={initialAnswers}
      />
    );
  }

  if (stepId === 5) {
    const answers = await loadGuidanceV2Step4Answers();

    if (!isAssessmentComplete(answers)) {
      redirect(guidanceJourneyV2StepPath(4));
    }

    const result = computeAssessmentResult(answers);

    return (
      <AssessmentResultV2Step
        sidebarSteps={sidebar}
        completionPercentage={plan.completionPercentage}
        result={result}
        answers={answers}
      />
    );
  }

  if (stepId === 6) {
    const stored = await loadGuidanceV2Step6({
      organizationId: context.organization.id,
      planPublicId: plan.publicId,
    });

    return (
      <EducationPreferencesV2Step
        sidebarSteps={sidebar}
        completionPercentage={plan.completionPercentage}
        initialItems={stored.items}
      />
    );
  }

  if (stepId === 7) {
    const stored = await loadGuidanceV2Step7({
      organizationId: context.organization.id,
      planPublicId: plan.publicId,
      homeProvince: null,
    });

    return (
      <CityPreferencesV2Step
        sidebarSteps={sidebar}
        completionPercentage={plan.completionPercentage}
        allProvinces={IRAN_PROVINCES}
        initialItems={stored.items}
      />
    );
  }

  if (stepId === 8) {
    const step2 = await loadGuidanceV2Step2({
      organizationId: context.organization.id,
      planPublicId: plan.publicId,
      fallbackPrimary: plan.examGroup,
    });

    const examGroups = [
      step2.data?.primary ?? plan.examGroup,
      ...(step2.data?.secondary ?? []),
    ];

    const labels: Record<string, string> = {
      MATHEMATICS: "ریاضی و فیزیک",
      EXPERIMENTAL_SCIENCES: "علوم تجربی",
      HUMANITIES: "علوم انسانی",
      ARTS: "هنر",
      LANGUAGES: "زبان‌های خارجی",
    };

    const majorsByGroup = examGroups.map((group) => ({
      group,
      label: labels[group] ?? String(group),
      majors: getMajorsForExamGroup(group),
    }));

    const stored = await loadGuidanceV2Step8({
      organizationId: context.organization.id,
      planPublicId: plan.publicId,
      examGroups,
    });

    return (
      <MajorPreferencesV2Step
        sidebarSteps={sidebar}
        completionPercentage={plan.completionPercentage}
        initialItems={stored.items}
        majorsByGroup={majorsByGroup}
      />
    );
  }

  if (stepId === 9) {
    const stored = await loadGuidanceV2Step9({
      organizationId: context.organization.id,
      planPublicId: plan.publicId,
    });

    return (
      <PriorityFactorsV2Step
        sidebarSteps={sidebar}
        completionPercentage={plan.completionPercentage}
        factors={GUIDANCE_V2_PRIORITY_FACTORS}
        initialOrderedCodes={stored.orderedCodes}
      />
    );
  }

  const query = props.searchParams
    ? await props.searchParams
    : {};

  const rawPayment = Array.isArray(query.payment)
    ? query.payment[0]
    : query.payment;

  const paymentState =
    rawPayment === "success" ||
    rawPayment === "failed" ||
    rawPayment === "cancelled"
      ? rawPayment
      : null;

  return (
    <PackagePaymentV2Step
      sidebarSteps={sidebar}
      completionPercentage={plan.completionPercentage}
      packages={GUIDANCE_V2_PACKAGES}
      paymentSummary={null}
      packagePaid={Boolean(plan.packagePaidAtIso)}
      activePackageCode={plan.guidancePackageCode}
      paymentState={paymentState}
    />
  );
}
