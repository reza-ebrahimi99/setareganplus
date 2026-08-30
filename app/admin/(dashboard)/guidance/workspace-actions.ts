"use server";

/**
 * Counselor Workspace Phase 2 — staff mutations.
 * Auth: guidance.review. Never uses the student step-lock guard.
 */

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-admin";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { parseGuidanceJourneyStepParam } from "@/lib/guidance/journey/steps";
import { prisma } from "@/lib/prisma";
import {
  saveStepReviewNotes,
  setStepReviewStatus,
} from "@/lib/guidance/workspace/review";
import {
  counselorEditStep1,
  counselorEditStep2,
  counselorEditStep5,
  counselorEditStep6,
  counselorEditStep7,
  counselorEditStep8,
  counselorEditStep9,
} from "@/lib/guidance/workspace/edits";
import {
  replaceGuidanceDocumentAsCounselor,
  verifyGuidanceDocumentAsCounselor,
} from "@/lib/guidance/workspace/documents";
import type { AssessmentAnswers } from "@/lib/guidance/journey/assessment/scoring";
import type { EducationPreferenceItem } from "@/lib/guidance/journey/steps/step6-education-preferences";
import type { ProvincePreferenceItem } from "@/lib/guidance/journey/steps/step7-city-preferences";
import type { MajorPreferenceItem } from "@/lib/guidance/journey/steps/step8-major-preferences";
import type { GuidanceStepFormState } from "@/lib/guidance/journey/types";

export type WorkspaceActionResult = { ok: true } | { ok: false; error: string };

async function requireWorkspaceReview(publicId: string) {
  const session = await requirePermission("guidance.review");
  const enabled = await isGuidanceEnabled(session.organization.id);
  if (!enabled) {
    return { ok: false as const, error: "سامانه انتخاب رشته فعال نیست." };
  }
  const plan = await prisma.guidancePlan.findFirst({
    where: {
      organizationId: session.organization.id,
      publicId,
      deletedAt: null,
    },
    select: { id: true, publicId: true },
  });
  if (!plan) return { ok: false as const, error: "پرونده یافت نشد." };
  return { ok: true as const, session, plan };
}

function revalidateWorkspace(publicId: string, step?: number) {
  revalidatePath("/admin/guidance");
  revalidatePath(`/admin/guidance/${publicId}`);
  if (step) {
    revalidatePath(`/admin/guidance/${publicId}/steps/${step}`);
  }
}

export async function counselorSetStepReviewAction(formData: FormData): Promise<void> {
  const publicId = String(formData.get("publicId") ?? "");
  const step = parseGuidanceJourneyStepParam(String(formData.get("step") ?? ""));
  const decision = String(formData.get("decision") ?? "");
  const gate = await requireWorkspaceReview(publicId);
  if (!gate.ok) throw new Error(gate.error);
  if (!step) throw new Error("مرحله نامعتبر است.");
  if (decision !== "APPROVED" && decision !== "REJECTED" && decision !== "NEEDS_REVISION") {
    throw new Error("تصمیم نامعتبر است.");
  }
  const result = await setStepReviewStatus({
    organizationId: gate.session.organization.id,
    publicId,
    stepNumber: step,
    actorUserId: gate.session.user.id,
    nextStatus: decision,
    rejectReason: String(formData.get("rejectReason") ?? ""),
    privateNote: String(formData.get("privateNote") ?? ""),
    studentMessage: String(formData.get("studentMessage") ?? ""),
  });
  if (!result.ok) throw new Error(result.error);
  revalidateWorkspace(publicId, step);
}

export async function counselorSaveNotesAction(formData: FormData): Promise<void> {
  const publicId = String(formData.get("publicId") ?? "");
  const step = parseGuidanceJourneyStepParam(String(formData.get("step") ?? ""));
  const gate = await requireWorkspaceReview(publicId);
  if (!gate.ok) throw new Error(gate.error);
  if (!step) throw new Error("مرحله نامعتبر است.");
  const result = await saveStepReviewNotes({
    organizationId: gate.session.organization.id,
    publicId,
    stepNumber: step,
    actorUserId: gate.session.user.id,
    privateNote: String(formData.get("privateNote") ?? ""),
    studentMessage: String(formData.get("studentMessage") ?? ""),
  });
  if (!result.ok) throw new Error(result.error);
  revalidateWorkspace(publicId, step);
}

export async function counselorReplaceDocumentAction(formData: FormData): Promise<void> {
  const publicId = String(formData.get("publicId") ?? "");
  const gate = await requireWorkspaceReview(publicId);
  if (!gate.ok) throw new Error(gate.error);
  const typeRaw = String(formData.get("documentType") ?? "");
  const documentType =
    typeRaw === "EXAM_RESULT" ? "EXAM_RESULT" : "FINAL_GRADES";
  const fileValue = formData.get("file");
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    throw new Error("فایل الزامی است.");
  }
  const result = await replaceGuidanceDocumentAsCounselor({
    organizationId: gate.session.organization.id,
    actorUserId: gate.session.user.id,
    planId: gate.plan.id,
    publicId,
    documentType,
    file: fileValue,
    reason: String(formData.get("reason") ?? "جایگزینی مدرک توسط مشاور"),
  });
  if (!result.ok) throw new Error(result.error);
  revalidateWorkspace(publicId, documentType === "EXAM_RESULT" ? 5 : 1);
}

export async function counselorVerifyDocumentAction(formData: FormData): Promise<void> {
  const publicId = String(formData.get("publicId") ?? "");
  const gate = await requireWorkspaceReview(publicId);
  if (!gate.ok) throw new Error(gate.error);
  const documentId = String(formData.get("documentId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "VERIFIED" && decision !== "REJECTED") {
    throw new Error("تصمیم مدرک نامعتبر است.");
  }
  const result = await verifyGuidanceDocumentAsCounselor({
    organizationId: gate.session.organization.id,
    actorUserId: gate.session.user.id,
    planId: gate.plan.id,
    documentId,
    decision,
    note: String(formData.get("note") ?? ""),
  });
  if (!result.ok) throw new Error(result.error);
  revalidateWorkspace(publicId);
}

export async function counselorEditStep1Action(
  _state: GuidanceStepFormState,
  formData: FormData,
): Promise<GuidanceStepFormState> {
  const publicId = String(formData.get("publicId") ?? "");
  const gate = await requireWorkspaceReview(publicId);
  if (!gate.ok) return { error: gate.error };
  const fileValue = formData.get("file");
  const result = await counselorEditStep1({
    organizationId: gate.session.organization.id,
    actorUserId: gate.session.user.id,
    publicId,
    reason: String(formData.get("editReason") ?? "ویرایش مشاور"),
    input: {
      fullName: String(formData.get("fullName") ?? ""),
      nationalId: String(formData.get("nationalId") ?? ""),
      gender: String(formData.get("gender") ?? ""),
      birthDate: String(formData.get("birthDate") ?? ""),
      province: String(formData.get("province") ?? ""),
      quota: String(formData.get("quota") ?? ""),
      highSchoolAverage: String(formData.get("highSchoolAverage") ?? ""),
      confirmed: formData.get("confirmed") === "on",
    },
    file: fileValue instanceof File && fileValue.size > 0 ? fileValue : null,
  });
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };
  revalidateWorkspace(publicId, 1);
  return { ok: true };
}

export async function counselorEditStep2Action(
  _state: GuidanceStepFormState,
  formData: FormData,
): Promise<GuidanceStepFormState> {
  const publicId = String(formData.get("publicId") ?? "");
  const gate = await requireWorkspaceReview(publicId);
  if (!gate.ok) return { error: gate.error };
  const answers: AssessmentAnswers = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("q_")) continue;
    const id = key.slice(2);
    const n = Number(value);
    if (Number.isFinite(n)) answers[id] = n;
  }
  const result = await counselorEditStep2({
    organizationId: gate.session.organization.id,
    actorUserId: gate.session.user.id,
    publicId,
    reason: String(formData.get("editReason") ?? "ویرایش مشاور"),
    answers,
  });
  if (!result.ok) return { error: result.error };
  revalidateWorkspace(publicId, 2);
  return { ok: true };
}

export async function counselorEditStep5Action(
  _state: GuidanceStepFormState,
  formData: FormData,
): Promise<GuidanceStepFormState> {
  const publicId = String(formData.get("publicId") ?? "");
  const gate = await requireWorkspaceReview(publicId);
  if (!gate.ok) return { error: gate.error };
  const fileValue = formData.get("file");
  const result = await counselorEditStep5({
    organizationId: gate.session.organization.id,
    actorUserId: gate.session.user.id,
    publicId,
    reason: String(formData.get("editReason") ?? "ویرایش مشاور"),
    input: {
      nationalRank: String(formData.get("nationalRank") ?? ""),
      regionalRank: String(formData.get("regionalRank") ?? ""),
      quotaRank: String(formData.get("quotaRank") ?? ""),
      score: String(formData.get("score") ?? ""),
      acknowledged: formData.get("acknowledged") === "on",
    },
    file: fileValue instanceof File && fileValue.size > 0 ? fileValue : null,
  });
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };
  revalidateWorkspace(publicId, 5);
  return { ok: true };
}

export async function counselorEditStep6Action(
  publicId: string,
  items: EducationPreferenceItem[],
  reason: string,
): Promise<WorkspaceActionResult> {
  const gate = await requireWorkspaceReview(publicId);
  if (!gate.ok) return gate;
  const result = await counselorEditStep6({
    organizationId: gate.session.organization.id,
    actorUserId: gate.session.user.id,
    publicId,
    reason,
    items,
  });
  if (result.ok) revalidateWorkspace(publicId, 6);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function counselorEditStep7Action(
  publicId: string,
  items: ProvincePreferenceItem[],
  reason: string,
): Promise<WorkspaceActionResult> {
  const gate = await requireWorkspaceReview(publicId);
  if (!gate.ok) return gate;
  const result = await counselorEditStep7({
    organizationId: gate.session.organization.id,
    actorUserId: gate.session.user.id,
    publicId,
    reason,
    items,
  });
  if (result.ok) revalidateWorkspace(publicId, 7);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function counselorEditStep8Action(
  publicId: string,
  items: MajorPreferenceItem[],
  reason: string,
): Promise<WorkspaceActionResult> {
  const gate = await requireWorkspaceReview(publicId);
  if (!gate.ok) return gate;
  const result = await counselorEditStep8({
    organizationId: gate.session.organization.id,
    actorUserId: gate.session.user.id,
    publicId,
    reason,
    items,
  });
  if (result.ok) revalidateWorkspace(publicId, 8);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function counselorEditStep9Action(
  publicId: string,
  orderedCodes: string[],
  reason: string,
): Promise<WorkspaceActionResult> {
  const gate = await requireWorkspaceReview(publicId);
  if (!gate.ok) return gate;
  const result = await counselorEditStep9({
    organizationId: gate.session.organization.id,
    actorUserId: gate.session.user.id,
    publicId,
    reason,
    orderedCodes,
  });
  if (result.ok) revalidateWorkspace(publicId, 9);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
