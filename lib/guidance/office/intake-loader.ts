/**
 * Office intake context — onboarding record + plan + exam scores.
 */

import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import { loadGuidanceOnboardingRecord } from "@/lib/guidance/onboarding";
import {
  draftHasAcademic,
  draftHasIdentity,
  EMPTY_ONBOARDING_DRAFT,
  type GuidanceOnboardingDraft,
} from "@/lib/guidance/onboarding-draft";
import { listHighSchoolMajorOptionsForForm } from "@/lib/guidance/onboarding-options";
import { loadFinalExamScores } from "@/lib/guidance/office/final-exam-store";
import { prisma } from "@/lib/prisma";
import { IRAN_PROVINCES } from "@/lib/registration/iran-locations";
import type { PortalContext } from "@/lib/portal/auth/types";

export type OfficeIntakeContext = {
  mobile: string;
  provinces: readonly string[];
  majors: ReturnType<typeof listHighSchoolMajorOptionsForForm>;
  draft: GuidanceOnboardingDraft;
  hasIdentity: boolean;
  hasAcademic: boolean;
  examGroup: string;
  planId: string;
  planPublicId: string;
  gradesComplete: boolean;
  hasTranscript: boolean;
};

export async function loadOfficeIntakeContext(
  context: PortalContext,
  studentId: string,
): Promise<OfficeIntakeContext | null> {
  const plan = await loadGuidanceJourneyPlan({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (!plan) return null;

  const parsed = normalizeIranianMobile(context.user.mobile ?? "");
  const [record, transcript, scores] = await Promise.all([
    loadGuidanceOnboardingRecord({
      organizationId: context.organization.id,
      userId: context.user.id,
    }),
    prisma.guidanceDocument.findFirst({
      where: {
        organizationId: context.organization.id,
        planId: plan.id,
        documentType: "FINAL_GRADES",
        isLatest: true,
        deletedAt: null,
      },
      select: { originalFilename: true, versionNumber: true },
    }),
    loadFinalExamScores({
      organizationId: context.organization.id,
      planPublicId: plan.publicId,
      examGroup: plan.examGroup,
    }),
  ]);

  const draft = record?.draft ?? {
    ...EMPTY_ONBOARDING_DRAFT,
    quota: plan.quota ?? "",
  };

  if (!draft.quota && plan.quota) draft.quota = plan.quota;

  return {
    mobile: parsed.ok ? parsed.normalized : "",
    provinces: [...IRAN_PROVINCES],
    majors: listHighSchoolMajorOptionsForForm(),
    draft,
    hasIdentity: draftHasIdentity(draft),
    hasAcademic: draftHasAcademic(draft),
    examGroup: plan.examGroup,
    planId: plan.id,
    planPublicId: plan.publicId,
    gradesComplete: scores.summary.complete,
    hasTranscript: Boolean(transcript),
  };
}
