/**
 * CRM activity timeline helpers. Never store secrets/OTP/tokens in metadata.
 */

import type { Prisma } from "@/generated/prisma/client";
import { CrmActivityType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const FORBIDDEN_META_KEYS = new Set([
  "otp",
  "code",
  "password",
  "token",
  "cancelToken",
  "checkInToken",
  "apiKey",
  "secret",
]);

export function sanitizeActivityMetadata(
  raw: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | undefined {
  if (!raw) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (FORBIDDEN_META_KEYS.has(key)) continue;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      out[key] = value;
    }
  }
  return out as Prisma.InputJsonValue;
}

export async function recordCrmActivity(params: {
  organizationId: string;
  leadId: string;
  activityType: CrmActivityType;
  title: string;
  summary?: string | null;
  actorUserId?: string | null;
  relatedTaskId?: string | null;
  relatedFormSubmissionId?: string | null;
  relatedBookingReservationId?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt?: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any;
}): Promise<void> {
  const client = params.tx ?? prisma;
  await client.crmActivity.create({
    data: {
      organizationId: params.organizationId,
      leadId: params.leadId,
      activityType: params.activityType,
      title: params.title.trim(),
      summary: params.summary?.trim() || null,
      actorUserId: params.actorUserId ?? null,
      relatedTaskId: params.relatedTaskId ?? null,
      relatedFormSubmissionId: params.relatedFormSubmissionId ?? null,
      relatedBookingReservationId: params.relatedBookingReservationId ?? null,
      metadata: sanitizeActivityMetadata(params.metadata ?? undefined),
      occurredAt: params.occurredAt ?? new Date(),
    },
  });
}
