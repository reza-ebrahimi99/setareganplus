import type { Prisma } from "@/generated/prisma/client";
import { DomainEventType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

type BookingEventType =
  | typeof DomainEventType.BOOKING_CREATED
  | typeof DomainEventType.BOOKING_CONFIRMED
  | typeof DomainEventType.BOOKING_CANCELLED
  | typeof DomainEventType.BOOKING_RESCHEDULED
  | typeof DomainEventType.BOOKING_WAITLISTED
  | typeof DomainEventType.BOOKING_CHECKED_IN
  | typeof DomainEventType.BOOKING_COMPLETED
  | typeof DomainEventType.BOOKING_NO_SHOW;

/**
 * Write a booking domain event to the outbox.
 * Payload must be non-sensitive (no national ID / full mobile).
 */
export async function enqueueBookingEvent(params: {
  organizationId: string;
  branchId?: string | null;
  eventType: BookingEventType;
  reservationId: string;
  payload?: Record<string, string | number | boolean | null>;
  // Accept any Prisma interactive transaction client without brittle structural typing.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any;
}): Promise<void> {
  const client = params.tx ?? prisma;
  await client.domainEventOutbox.create({
    data: {
      organizationId: params.organizationId,
      branchId: params.branchId ?? null,
      eventType: params.eventType,
      aggregateType: "BookingReservation",
      aggregateId: params.reservationId,
      payload: {
        reservationId: params.reservationId,
        ...(params.payload ?? {}),
      } satisfies Prisma.InputJsonObject,
    },
  });
}
