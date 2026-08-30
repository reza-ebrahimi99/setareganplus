/**
 * Field-level counselor edit audit. Never silent.
 */

import { AuditAction } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { GuidanceJourneyStepId } from "@/lib/guidance/journey/steps";
import { recordStepEditEvent } from "@/lib/guidance/workspace/review";

export type FieldChange = {
  field: string;
  oldValue: string;
  newValue: string;
};

export function diffFields(
  before: Record<string, string>,
  after: Record<string, string>,
): FieldChange[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: FieldChange[] = [];
  for (const key of keys) {
    const oldValue = before[key] ?? "";
    const newValue = after[key] ?? "";
    if (oldValue !== newValue) {
      changes.push({ field: key, oldValue, newValue });
    }
  }
  return changes;
}

export async function logCounselorFieldEdits(params: {
  organizationId: string;
  actorUserId: string;
  planId: string;
  publicId: string;
  stepNumber: GuidanceJourneyStepId;
  changes: readonly FieldChange[];
  reason: string;
}): Promise<void> {
  if (params.changes.length === 0) return;

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: AuditAction.GUIDANCE_FIELD_EDITED,
      entityType: "GuidancePlan",
      entityId: params.planId,
      metadata: {
        publicId: params.publicId,
        step: params.stepNumber,
        reason: params.reason,
        changes: params.changes,
      },
    },
  });

  await recordStepEditEvent({
    organizationId: params.organizationId,
    planId: params.planId,
    publicId: params.publicId,
    stepNumber: params.stepNumber,
    actorUserId: params.actorUserId,
    changes: params.changes,
    reason: params.reason,
  });
}
