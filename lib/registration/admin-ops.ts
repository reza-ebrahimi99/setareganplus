/**
 * Admin mutations for Registration Management Center.
 */

import {
  RegistrationActivityType,
  RegistrationPaymentStatus,
  RegistrationStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { recordRegistrationActivity } from "@/lib/registration/activity";

export async function updateRegistrationStatus(params: {
  organizationId: string;
  registrationId: string;
  status: RegistrationStatus;
  actorUserId: string;
  reason?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await prisma.registration.findFirst({
    where: {
      id: params.registrationId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true, status: true },
  });
  if (!row) return { ok: false, error: "ثبت‌نام یافت نشد." };

  const paymentStatus =
    params.status === RegistrationStatus.WAITING_PAYMENT
      ? RegistrationPaymentStatus.AWAITING
      : params.status === RegistrationStatus.APPROVED
        ? undefined
        : undefined;

  await prisma.registration.update({
    where: { id: row.id },
    data: {
      status: params.status,
      ...(paymentStatus ? { paymentStatus } : {}),
      lastActivityAt: new Date(),
      abandonedReason: params.reason?.trim() || null,
    },
  });

  await recordRegistrationActivity({
    organizationId: params.organizationId,
    registrationId: row.id,
    activityType: RegistrationActivityType.STATUS_CHANGED,
    title: "تغییر وضعیت",
    summary: `${row.status} → ${params.status}`,
    actorUserId: params.actorUserId,
    metadata: {
      from: row.status,
      to: params.status,
      reason: params.reason?.trim() || null,
    },
  });

  return { ok: true };
}

export async function addRegistrationNote(params: {
  organizationId: string;
  registrationId: string;
  body: string;
  actorUserId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const body = params.body.trim();
  if (!body) return { ok: false, error: "متن یادداشت خالی است." };

  const row = await prisma.registration.findFirst({
    where: {
      id: params.registrationId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!row) return { ok: false, error: "ثبت‌نام یافت نشد." };

  await prisma.registrationNote.create({
    data: {
      organizationId: params.organizationId,
      registrationId: row.id,
      body,
      actorUserId: params.actorUserId,
    },
  });

  await prisma.registration.update({
    where: { id: row.id },
    data: {
      adminNotesSummary: body.slice(0, 200),
      lastActivityAt: new Date(),
    },
  });

  await recordRegistrationActivity({
    organizationId: params.organizationId,
    registrationId: row.id,
    activityType: RegistrationActivityType.NOTE_ADDED,
    title: "یادداشت افزوده شد",
    summary: body.slice(0, 120),
    actorUserId: params.actorUserId,
  });

  return { ok: true };
}

export async function markRegistrationNeedsCall(params: {
  organizationId: string;
  registrationId: string;
  actorUserId: string;
}) {
  return updateRegistrationStatus({
    ...params,
    status: RegistrationStatus.NEEDS_CALL,
    reason: "نیاز به تماس پیگیری",
  });
}
