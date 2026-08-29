import { DomainEventType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { SMS_SENT_EVENT_TYPE } from "@/lib/sxp/constants";
import { isBookingEventType } from "@/lib/sxp/engine/catalog";
import { readString } from "@/lib/sxp/engine/payload";
import type { EngineSourceEvent } from "@/lib/sxp/engine/types";

async function userIdForMobile(
  organizationId: string,
  normalizedMobile: string | null,
): Promise<string | null> {
  if (!normalizedMobile) return null;
  const user = await prisma.user.findFirst({
    where: {
      normalizedMobile,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!user) return null;

  const membership = await prisma.organizationMembership.findFirst({
    where: {
      organizationId,
      userId: user.id,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (membership) return user.id;

  const portalLink = await prisma.portalAccountLink.findFirst({
    where: {
      organizationId,
      userId: user.id,
      deletedAt: null,
    },
    select: { id: true },
  });
  return portalLink ? user.id : null;
}

/**
 * Worker-only resolution. Hub HTTP must not call this.
 * Booking/form payloads are privacy-limited; mobile lives on source documents.
 */
export async function resolveExperienceUserId(
  event: EngineSourceEvent,
): Promise<string | null> {
  if (event.sourceKind === "sms" || event.eventType === SMS_SENT_EVENT_TYPE) {
    const toMobile = readString(event.payload, "toMobile");
    return userIdForMobile(event.organizationId, toMobile);
  }

  if (isBookingEventType(event.eventType)) {
    const reservation = await prisma.bookingReservation.findFirst({
      where: {
        organizationId: event.organizationId,
        id: event.aggregateId,
        deletedAt: null,
      },
      select: { normalizedMobile: true },
    });
    return userIdForMobile(
      event.organizationId,
      reservation?.normalizedMobile ?? null,
    );
  }

  if (
    event.eventType === DomainEventType.FORM_SUBMISSION_RECEIVED ||
    event.eventType === DomainEventType.FORM_DUPLICATE_DETECTED
  ) {
    const submission = await prisma.formSubmission.findFirst({
      where: {
        organizationId: event.organizationId,
        id: event.aggregateId,
        deletedAt: null,
      },
      select: { normalizedMobile: true },
    });
    return userIdForMobile(
      event.organizationId,
      submission?.normalizedMobile ?? null,
    );
  }

  return null;
}
