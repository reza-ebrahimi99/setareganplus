"use server";

import { revalidatePath } from "next/cache";
import { requireCounselorContext, assertCounselorCanAccessStudent } from "@/lib/counselor-os/auth";
import {
  cancelStepRevision,
  markStepReviewed,
  requestStepRevision,
} from "@/lib/guidance/journey-v2/step-review/service";
import { requestHollandRetake, setHollandActiveBasis } from "@/lib/guidance/journey-v2/step-review/holland";
import { isGuidanceV2StepId } from "@/lib/guidance/journey-v2/catalog";

export type StepReviewActionState = { ok?: boolean; error?: string };

function revalidateCase(studentId: string) {
  revalidatePath(`/admin/counselor/students/${studentId}`);
}

export async function counselorRequestStepRevisionAction(
  _prev: StepReviewActionState,
  formData: FormData,
): Promise<StepReviewActionState> {
  const ctx = await requireCounselorContext();
  const studentId = String(formData.get("studentId") ?? "");
  const step = Number(formData.get("stepNumber"));
  if (!studentId || !isGuidanceV2StepId(step)) {
    return { error: "درخواست نامعتبر است." };
  }
  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId,
    canReview: ctx.canReview,
    isSupervisor: ctx.isSupervisor,
  });
  const result = await requestStepRevision({
    organizationId: ctx.organizationId,
    studentId,
    stepNumber: step,
    counselorUserId: ctx.userId,
    reason: String(formData.get("reason") ?? ""),
    studentMessage: String(formData.get("studentMessage") ?? ""),
    requestedSections: String(formData.get("sections") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    retakeFromBeginning: formData.get("retakeFromBeginning") === "on",
    notifyStudent: formData.get("notifyStudent") !== "off",
  });
  if (!result.ok) return { error: result.error };
  revalidateCase(studentId);
  return { ok: true };
}

export async function counselorMarkStepReviewedAction(
  _prev: StepReviewActionState,
  formData: FormData,
): Promise<StepReviewActionState> {
  const ctx = await requireCounselorContext();
  const studentId = String(formData.get("studentId") ?? "");
  const step = Number(formData.get("stepNumber"));
  if (!studentId || !isGuidanceV2StepId(step)) return { error: "درخواست نامعتبر است." };
  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId,
    canReview: ctx.canReview,
    isSupervisor: ctx.isSupervisor,
  });
  const result = await markStepReviewed({
    organizationId: ctx.organizationId,
    studentId,
    stepNumber: step,
    counselorUserId: ctx.userId,
    privateNote: String(formData.get("privateNote") ?? ""),
  });
  if (!result.ok) return { error: result.error };
  revalidateCase(studentId);
  return { ok: true };
}

export async function counselorCancelStepRevisionAction(
  _prev: StepReviewActionState,
  formData: FormData,
): Promise<StepReviewActionState> {
  const ctx = await requireCounselorContext();
  const studentId = String(formData.get("studentId") ?? "");
  const step = Number(formData.get("stepNumber"));
  if (!studentId || !isGuidanceV2StepId(step)) return { error: "درخواست نامعتبر است." };
  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId,
    canReview: ctx.canReview,
    isSupervisor: ctx.isSupervisor,
  });
  const result = await cancelStepRevision({
    organizationId: ctx.organizationId,
    studentId,
    stepNumber: step,
    counselorUserId: ctx.userId,
  });
  if (!result.ok) return { error: result.error };
  revalidateCase(studentId);
  return { ok: true };
}

export async function counselorHollandRetakeAction(
  _prev: StepReviewActionState,
  formData: FormData,
): Promise<StepReviewActionState> {
  const ctx = await requireCounselorContext();
  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) return { error: "دانش‌آموز نامعتبر است." };
  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId,
    canReview: ctx.canReview,
    isSupervisor: ctx.isSupervisor,
  });
  const result = await requestHollandRetake({
    organizationId: ctx.organizationId,
    studentId,
    counselorUserId: ctx.userId,
    reason: String(formData.get("reason") ?? ""),
  });
  if (!result.ok) return { error: result.error };
  revalidateCase(studentId);
  return { ok: true };
}

export async function counselorHollandBasisAction(
  _prev: StepReviewActionState,
  formData: FormData,
): Promise<StepReviewActionState> {
  const ctx = await requireCounselorContext();
  const studentId = String(formData.get("studentId") ?? "");
  const attemptId = String(formData.get("attemptId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  if (!studentId || !attemptId || !planId) return { error: "درخواست نامعتبر است." };
  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId,
    canReview: ctx.canReview,
    isSupervisor: ctx.isSupervisor,
  });
  const result = await setHollandActiveBasis({
    organizationId: ctx.organizationId,
    planId,
    attemptId,
    counselorUserId: ctx.userId,
  });
  if (!result.ok) return { error: result.error };
  revalidateCase(studentId);
  return { ok: true };
}

export async function counselorStepReviewNotesAction(
  _prev: StepReviewActionState,
  formData: FormData,
): Promise<StepReviewActionState> {
  const ctx = await requireCounselorContext();
  const studentId = String(formData.get("studentId") ?? "");
  const publicId = String(formData.get("publicId") ?? "");
  const step = Number(formData.get("stepNumber"));
  if (!studentId || !publicId || !isGuidanceV2StepId(step)) {
    return { error: "درخواست نامعتبر است." };
  }
  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId,
    canReview: ctx.canReview,
    isSupervisor: ctx.isSupervisor,
  });
  const { saveV2StepReviewNotes } = await import("@/lib/guidance/journey-v2/step-review/service");
  const plan = await import("@/lib/prisma").then((m) =>
    m.prisma.guidancePlan.findFirst({
      where: {
        organizationId: ctx.organizationId,
        publicId,
        studentId,
        deletedAt: null,
      },
      select: { id: true },
    }),
  );
  if (!plan) return { error: "پرونده یافت نشد." };
  const result = await saveV2StepReviewNotes({
    organizationId: ctx.organizationId,
    planId: plan.id,
    stepNumber: step,
    actorUserId: ctx.userId,
    privateNote: String(formData.get("privateNote") ?? ""),
    studentMessage: String(formData.get("studentMessage") ?? ""),
  });
  if (!result.ok) return { error: result.error };
  revalidateCase(studentId);
  return { ok: true };
}
