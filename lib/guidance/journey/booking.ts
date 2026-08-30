/**
 * Guidance Journey Engine — Steps 4 & 11 (Counseling Sessions).
 *
 * Reuses the existing Booking module end-to-end: BookingService/BookingSlot
 * are managed by counselors/admins through the existing Booking admin UI
 * (nothing new to seed or migrate). Students only ever see and reserve
 * already-published slots via the existing, generic createReservation().
 *
 * The link between a reservation and a GuidancePlan/step lives in the
 * generic step-store (same MediaAsset-JSON pattern as other steps) — no new
 * schema. Live status is always re-checked against BookingReservation
 * before a step is ever considered "booked".
 */

import { AuditAction, BookingStatus } from "@/generated/prisma/enums";
import { createReservation } from "@/lib/booking/reserve";
import { prisma } from "@/lib/prisma";
import { advanceGuidanceJourneyStep } from "@/lib/guidance/journey/advance";
import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import {
  loadGuidanceStepData,
  saveGuidanceStepData,
} from "@/lib/guidance/journey/step-store";
import type { GuidanceJourneyStepId } from "@/lib/guidance/journey/steps";

export const GUIDANCE_FIRST_SESSION_SERVICE_SLUG = "guidance-first-session";
export const GUIDANCE_SECOND_SESSION_SERVICE_SLUG = "guidance-second-session";

type CounselingSessionNumber = 1 | 2;

function categoryFor(sessionNumber: CounselingSessionNumber): string {
  return sessionNumber === 1
    ? "guidance-journey-step4"
    : "guidance-journey-step11";
}

function kindFor(sessionNumber: CounselingSessionNumber): string {
  return sessionNumber === 1
    ? "guidance-journey-step4"
    : "guidance-journey-step11";
}

function stepIdFor(sessionNumber: CounselingSessionNumber): GuidanceJourneyStepId {
  return sessionNumber === 1 ? 4 : 11;
}

function serviceSlugFor(sessionNumber: CounselingSessionNumber): string {
  return sessionNumber === 1
    ? GUIDANCE_FIRST_SESSION_SERVICE_SLUG
    : GUIDANCE_SECOND_SESSION_SERVICE_SLUG;
}

export type GuidanceBookableSlot = {
  id: string;
  startsAtIso: string;
  endsAtIso: string;
  advisorName: string;
  remainingCapacity: number;
};

export type GuidanceBookingServiceView = {
  configured: boolean;
  serviceId: string | null;
  serviceTitle: string | null;
  durationMinutes: number | null;
  slots: GuidanceBookableSlot[];
};

/** Loads the org's published slots for a counseling session — read-only, no seeding. */
export async function loadGuidanceBookableSlots(params: {
  organizationId: string;
  sessionNumber: CounselingSessionNumber;
}): Promise<GuidanceBookingServiceView> {
  const service = await prisma.bookingService.findFirst({
    where: {
      organizationId: params.organizationId,
      slug: serviceSlugFor(params.sessionNumber),
      isActive: true,
      deletedAt: null,
    },
    select: { id: true, title: true, durationMinutes: true },
  });

  if (!service) {
    return { configured: false, serviceId: null, serviceTitle: null, durationMinutes: null, slots: [] };
  }

  const slots = await prisma.bookingSlot.findMany({
    where: {
      organizationId: params.organizationId,
      serviceId: service.id,
      status: "OPEN",
      startsAt: { gt: new Date() },
    },
    orderBy: { startsAt: "asc" },
    take: 40,
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      capacity: true,
      bookedCount: true,
      advisor: { select: { displayName: true } },
    },
  });

  return {
    configured: true,
    serviceId: service.id,
    serviceTitle: service.title,
    durationMinutes: service.durationMinutes,
    slots: slots
      .filter((slot) => slot.bookedCount < slot.capacity)
      .map((slot) => ({
        id: slot.id,
        startsAtIso: slot.startsAt.toISOString(),
        endsAtIso: slot.endsAt.toISOString(),
        advisorName: slot.advisor.displayName,
        remainingCapacity: slot.capacity - slot.bookedCount,
      })),
  };
}

export type StoredCounselingSession = {
  reservationId: string;
  trackingCode: string;
  slotId: string;
  startsAtIso: string;
  bookedAtIso: string;
};

function validateStoredSession(raw: unknown): StoredCounselingSession | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.reservationId !== "string" || typeof obj.slotId !== "string") {
    return null;
  }
  return {
    reservationId: obj.reservationId,
    trackingCode: typeof obj.trackingCode === "string" ? obj.trackingCode : "",
    slotId: obj.slotId,
    startsAtIso: typeof obj.startsAtIso === "string" ? obj.startsAtIso : "",
    bookedAtIso: typeof obj.bookedAtIso === "string" ? obj.bookedAtIso : "",
  };
}

/** Live-checks the stored reservation against BookingReservation (never trusts a stale snapshot). */
export async function loadGuidanceCounselingSessionState(params: {
  organizationId: string;
  planPublicId: string;
  sessionNumber: CounselingSessionNumber;
}): Promise<{ session: StoredCounselingSession | null; isActive: boolean }> {
  const stored = await loadGuidanceStepData<StoredCounselingSession>({
    organizationId: params.organizationId,
    category: categoryFor(params.sessionNumber),
    kind: kindFor(params.sessionNumber),
    planPublicId: params.planPublicId,
    validate: validateStoredSession,
  });

  if (!stored.data) {
    return { session: null, isActive: false };
  }

  const reservation = await prisma.bookingReservation.findFirst({
    where: {
      id: stored.data.reservationId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { status: true },
  });

  const isActive = Boolean(reservation) && reservation!.status !== BookingStatus.CANCELLED;
  return { session: stored.data, isActive };
}

export type ReserveGuidanceSessionResult =
  | { ok: true; trackingCode: string }
  | { ok: false; error: string };

export async function reserveGuidanceCounselingSlot(params: {
  organizationId: string;
  actorUserId: string;
  studentId: string;
  planId: string;
  planPublicId: string;
  sessionNumber: CounselingSessionNumber;
  slotId: string;
  firstName: string;
  lastName: string;
  mobile: string;
}): Promise<ReserveGuidanceSessionResult> {
  // Defense in depth: the page-level guard (requireGuidanceJourneyStepAccess)
  // already enforces this before a caller can even reach this action, but a
  // real BookingReservation is a side effect with no automatic rollback, so
  // re-check here too rather than relying solely on the later advance-step
  // guard (which would otherwise reject the step transition *after* the
  // slot was already consumed).
  const plan = await loadGuidanceJourneyPlan({
    organizationId: params.organizationId,
    userId: params.actorUserId,
    studentId: params.studentId,
  });
  if (!plan || plan.currentStep !== stepIdFor(params.sessionNumber)) {
    return { ok: false, error: "این مرحله در حال حاضر مرحله فعال پرونده شما نیست." };
  }

  const existing = await loadGuidanceCounselingSessionState({
    organizationId: params.organizationId,
    planPublicId: params.planPublicId,
    sessionNumber: params.sessionNumber,
  });
  if (existing.isActive) {
    return { ok: false, error: "برای این جلسه قبلاً نوبت رزرو شده است." };
  }

  const reserved = await createReservation({
    organizationId: params.organizationId,
    slotId: params.slotId,
    firstName: params.firstName,
    lastName: params.lastName,
    mobile: params.mobile,
  });

  if (!reserved.ok) {
    return { ok: false, error: reserved.error };
  }

  const slot = await prisma.bookingSlot.findFirst({
    where: { id: params.slotId, organizationId: params.organizationId },
    select: { startsAt: true },
  });

  await saveGuidanceStepData<StoredCounselingSession>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: categoryFor(params.sessionNumber),
    kind: kindFor(params.sessionNumber),
    planId: params.planId,
    planPublicId: params.planPublicId,
    data: {
      reservationId: reserved.reservationId,
      trackingCode: reserved.trackingCode,
      slotId: params.slotId,
      startsAtIso: slot?.startsAt.toISOString() ?? new Date().toISOString(),
      bookedAtIso: new Date().toISOString(),
    },
    filenamePrefix: `guidance-session-${params.sessionNumber}`,
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: AuditAction.GUIDANCE_BOOKING_RESERVED,
      entityType: "GuidancePlan",
      entityId: params.planId,
      metadata: {
        publicId: params.planPublicId,
        sessionNumber: params.sessionNumber,
        reservationId: reserved.reservationId,
        trackingCode: reserved.trackingCode,
      },
    },
  });

  const advanced = await advanceGuidanceJourneyStep({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    studentId: params.studentId,
    stepId: stepIdFor(params.sessionNumber),
    metadata: { reservationId: reserved.reservationId },
  });

  if (!advanced.ok) {
    return { ok: false, error: advanced.error };
  }

  return { ok: true, trackingCode: reserved.trackingCode };
}
