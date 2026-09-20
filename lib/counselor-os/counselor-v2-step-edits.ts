/**
 * Counselor direct edits for Guidance V2 steps (no payment / booking lifecycle).
 */

import { saveGuidanceStepData } from "@/lib/guidance/journey/step-store";
import { loadGuidanceV2Plan } from "@/lib/guidance/journey-v2/plan";
import { recordCounselorStepEdit } from "@/lib/guidance/journey-v2/step-review/service";
import { loadGuidanceV2Step1, type GuidanceV2Step1Data } from "@/lib/guidance/journey-v2/steps/step1-personal-info";
import { loadGuidanceV2Step2, type GuidanceV2Step2Data } from "@/lib/guidance/journey-v2/steps/step2-exam-groups";
import type { GuidanceV2StepId } from "@/lib/guidance/journey-v2/catalog";

export type CounselorV2EditResult = { ok: true } | { ok: false; error: string };

async function gate(params: {
  organizationId: string;
  studentId: string;
  counselorUserId: string;
  reason: string;
  stepNumber: GuidanceV2StepId;
}) {
  if (!params.reason.trim()) return { ok: false as const, error: "دلیل ویرایش الزامی است." };
  const plan = await loadGuidanceV2Plan({
    organizationId: params.organizationId,
    studentId: params.studentId,
  });
  if (!plan) return { ok: false as const, error: "پرونده V2 یافت نشد." };
  return { ok: true as const, plan };
}

function snap(data: unknown): Record<string, string> {
  if (!data || typeof data !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    out[k] = v == null ? "" : String(v);
  }
  return out;
}

export async function counselorV2EditStep1(params: {
  organizationId: string;
  studentId: string;
  counselorUserId: string;
  reason: string;
  data: GuidanceV2Step1Data;
}): Promise<CounselorV2EditResult> {
  const g = await gate({ ...params, stepNumber: 1 });
  if (!g.ok) return g;
  const before = await loadGuidanceV2Step1({
    organizationId: params.organizationId,
    planPublicId: g.plan.publicId,
  });
  await saveGuidanceStepData({
    organizationId: params.organizationId,
    actorUserId: params.counselorUserId,
    category: "guidance-journey-v2-step1",
    kind: "guidance-journey-v2-step1",
    planId: g.plan.id,
    planPublicId: g.plan.publicId,
    data: params.data,
    filenamePrefix: "guidance-v2-step1",
  });
  return recordCounselorStepEdit({
    organizationId: params.organizationId,
    studentId: params.studentId,
    stepNumber: 1,
    counselorUserId: params.counselorUserId,
    reason: params.reason,
    beforeSnapshot: snap(before.data),
    afterSnapshot: snap(params.data),
  });
}

export async function counselorV2EditStep2(params: {
  organizationId: string;
  studentId: string;
  counselorUserId: string;
  reason: string;
  data: GuidanceV2Step2Data;
}): Promise<CounselorV2EditResult> {
  const g = await gate({ ...params, stepNumber: 2 });
  if (!g.ok) return g;
  const before = await loadGuidanceV2Step2({
    organizationId: params.organizationId,
    planPublicId: g.plan.publicId,
    fallbackPrimary: g.plan.examGroup,
  });
  await saveGuidanceStepData({
    organizationId: params.organizationId,
    actorUserId: params.counselorUserId,
    category: "guidance-journey-v2-step2",
    kind: "guidance-journey-v2-step2",
    planId: g.plan.id,
    planPublicId: g.plan.publicId,
    data: params.data,
    filenamePrefix: "guidance-v2-step2",
  });
  return recordCounselorStepEdit({
    organizationId: params.organizationId,
    studentId: params.studentId,
    stepNumber: 2,
    counselorUserId: params.counselorUserId,
    reason: params.reason,
    beforeSnapshot: snap(before.data),
    afterSnapshot: snap(params.data),
  });
}

/** Steps 3,5,10,11–18: use dedicated UI; 6–9 reuse legacy JSON stores (same as V2 dossier). */
export async function counselorV2EditGenericJson(params: {
  organizationId: string;
  studentId: string;
  counselorUserId: string;
  reason: string;
  stepNumber: GuidanceV2StepId;
  category: string;
  kind: string;
  filenamePrefix: string;
  before: unknown;
  after: unknown;
}): Promise<CounselorV2EditResult> {
  const g = await gate(params);
  if (!g.ok) return g;
  await saveGuidanceStepData({
    organizationId: params.organizationId,
    actorUserId: params.counselorUserId,
    category: params.category,
    kind: params.kind,
    planId: g.plan.id,
    planPublicId: g.plan.publicId,
    data: params.after,
    filenamePrefix: params.filenamePrefix,
  });
  return recordCounselorStepEdit({
    organizationId: params.organizationId,
    studentId: params.studentId,
    stepNumber: params.stepNumber,
    counselorUserId: params.counselorUserId,
    reason: params.reason,
    beforeSnapshot: params.before,
    afterSnapshot: params.after,
  });
}
