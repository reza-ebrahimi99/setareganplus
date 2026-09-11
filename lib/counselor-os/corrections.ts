/**
 * Counselor corrections — validated writes + additive audit rows.
 */

import {
  assertCounselorCanAccessStudent,
  type CounselorContext,
} from "@/lib/counselor-os/auth";
import { COUNSELOR_EDITABLE_PERSONAL_FIELDS } from "@/lib/counselor-os/labels";
import type { CounselorCorrectionView } from "@/lib/counselor-os/view-models";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { loadGuidanceStepData, saveGuidanceStepData } from "@/lib/guidance/journey/step-store";
import { prisma } from "@/lib/prisma";

export type CorrectionView = CounselorCorrectionView;

const EDITABLE_PERSONAL = COUNSELOR_EDITABLE_PERSONAL_FIELDS;

export async function listCounselorCorrections(
  ctx: CounselorContext,
  studentId: string,
): Promise<CorrectionView[]> {
  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId,
    canReview: ctx.canReview,
  });

  const rows = await prisma.counselorCaseCorrection.findMany({
    where: { organizationId: ctx.organizationId, studentId },
    include: { counselor: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return rows.map((row) => ({
    id: row.id,
    section: row.section,
    fieldLabel: row.fieldLabel,
    previousValue: row.previousValue,
    newValue: row.newValue,
    reason: row.reason,
    actorName: `${row.counselor.firstName} ${row.counselor.lastName}`.trim(),
    createdLabel: formatJalaliDateTimeShort(row.createdAt),
  }));
}

export async function correctPersonalInfoField(params: {
  ctx: CounselorContext;
  studentId: string;
  fieldKey: string;
  nextValue: string;
  reason?: string;
}) {
  await assertCounselorCanAccessStudent({
    organizationId: params.ctx.organizationId,
    counselorUserId: params.ctx.userId,
    studentId: params.studentId,
    canReview: params.ctx.canReview,
  });

  const fieldLabel = EDITABLE_PERSONAL[params.fieldKey];
  if (!fieldLabel) {
    throw new Error("این فیلد قابل ویرایش نیست.");
  }

  const next = params.nextValue.trim();
  if (!next || next.length > 120) {
    throw new Error("مقدار جدید نامعتبر است.");
  }
  if (params.fieldKey === "highSchoolAverage") {
    const n = Number(next.replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 20) {
      throw new Error("معدل باید بین ۰ تا ۲۰ باشد.");
    }
  }

  const plan = await prisma.guidancePlan.findFirst({
    where: {
      organizationId: params.ctx.organizationId,
      studentId: params.studentId,
      deletedAt: null,
      journeyVersion: 2,
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!plan) throw new Error("پرونده انتخاب رشته یافت نشد.");

  const stored = await loadGuidanceStepData<Record<string, unknown>>({
    organizationId: params.ctx.organizationId,
    planPublicId: plan.publicId,
    category: "guidance-journey-v2-step1",
    kind: "guidance-journey-v2-step1",
    validate: (raw) => (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}),
  });

  const previous = stored.data ?? {};
  const previousValue = String(previous[params.fieldKey] ?? "");
  const nextData = {
    ...previous,
    [params.fieldKey]:
      params.fieldKey === "highSchoolAverage" ? Number(next.replace(",", ".")) : next,
  };

  await saveGuidanceStepData({
    organizationId: params.ctx.organizationId,
    actorUserId: params.ctx.userId,
    category: "guidance-journey-v2-step1",
    kind: "guidance-journey-v2-step1",
    planId: plan.id,
    planPublicId: plan.publicId,
    data: nextData,
    filenamePrefix: "guidance-v2-personal",
  });

  await prisma.counselorCaseCorrection.create({
    data: {
      organizationId: params.ctx.organizationId,
      studentId: params.studentId,
      counselorUserId: params.ctx.userId,
      section: "personal",
      fieldKey: params.fieldKey,
      fieldLabel,
      previousValue: previousValue || "—",
      newValue: next,
      reason: params.reason?.trim() || null,
    },
  });
}

export { COUNSELOR_EDITABLE_PERSONAL_FIELDS };
