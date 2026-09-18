"use server";

import { GuidanceDocumentType } from "@/generated/prisma/enums";
import { advanceGuidanceJourneyV2Step } from "@/lib/guidance/journey-v2/advance";
import { uploadGuidanceTypedDocument } from "@/lib/guidance/journey-v2/documents";
import { requireGuidanceV2StepAccess } from "@/lib/guidance/journey-v2/guard";
import {
  parseFinalExamScore,
  subjectsForExamGroup,
  type FinalExamScoreMap,
} from "@/lib/guidance/office/final-exam";
import { saveFinalExamScores } from "@/lib/guidance/office/final-exam-store";
import type { JourneyV2FormState } from "./step1";

export async function submitGuidanceV2Step3Action(
  _prev: JourneyV2FormState,
  formData: FormData,
): Promise<JourneyV2FormState> {
  const access = await requireGuidanceV2StepAccess(3);
  const subjects = subjectsForExamGroup(access.plan.examGroup);
  const scores: FinalExamScoreMap = {};
  const fieldErrors: Record<string, string> = {};

  for (const subject of subjects) {
    const key = `score_${subject.id}`;
    const raw = String(formData.get(key) ?? "").trim();
    const parsed = parseFinalExamScore(raw);

    if (!raw || parsed === null) {
      fieldErrors[key] = "نمره باید بین ۰ تا ۲۰ باشد.";
    } else {
      scores[subject.id] = parsed;
    }
  }

  if (Object.keys(fieldErrors).length) {
    return {
      error: "لطفاً نمرات را کامل و صحیح وارد کنید.",
      fieldErrors,
    };
  }

  const transcript = formData.get("transcript");
  if (transcript instanceof File && transcript.size > 0) {
    const uploaded = await uploadGuidanceTypedDocument({
      organizationId: access.plan.organizationId,
      planId: access.plan.id,
      planPublicId: access.plan.publicId,
      userId: access.context.user.id,
      file: transcript,
      documentType: GuidanceDocumentType.FINAL_GRADES,
    });

    if (!uploaded.ok) {
      return {
        error: uploaded.error,
        fieldErrors: {
          transcript:
            uploaded.fieldErrors?.file ??
            uploaded.error,
        },
      };
    }
  }

  const saved = await saveFinalExamScores({
    organizationId: access.plan.organizationId,
    actorUserId: access.context.user.id,
    planId: access.plan.id,
    planPublicId: access.plan.publicId,
    examGroup: access.plan.examGroup,
    scores,
  });

  const advanced = await advanceGuidanceJourneyV2Step({
    organizationId: access.plan.organizationId,
    actorUserId: access.context.user.id,
    studentId: access.plan.studentId,
    stepId: 3,
    metadata: {
      finalExamAverage: saved.summary.average,
    },
  });

  if (!advanced.ok) {
    return {
      error: advanced.error,
      fieldErrors: advanced.fieldErrors,
    };
  }

  return { ok: true };
}
