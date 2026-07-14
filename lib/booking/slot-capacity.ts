/**
 * Concurrency-safe slot capacity mutations.
 *
 * Invariants:
 * 1. bookedCount never exceeds capacity for OPEN slots.
 * 2. Capacity is claimed only via atomic UPDATE … WHERE booked_count < capacity.
 * 3. Waiting-list increments waitingCount and never consumes bookedCount.
 * 4. Cancellation of CONFIRMED/PENDING decrements bookedCount when status was capacity-consuming.
 * 5. Client-side remaining capacity is advisory only — always recheck in a transaction.
 */

import {
  BookingSlotStatus,
  BookingStatus,
} from "@/generated/prisma/enums";

export const CAPACITY_CONSUMING_BOOKING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
] as const;

export type SlotCapacityTx = {
  $executeRaw: (
    query: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<unknown>;
  $queryRaw: <T = unknown>(
    query: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<T>;
  bookingSlot: {
    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };
};

/**
 * Atomically claim one seat on an OPEN slot.
 * Returns true when a row was updated.
 */
export async function claimSlotSeat(
  tx: SlotCapacityTx,
  slotId: string,
): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    UPDATE booking_slots
    SET
      "bookedCount" = "bookedCount" + 1,
      "status" = CASE
        WHEN "bookedCount" + 1 >= "capacity" THEN 'FULL'::"BookingSlotStatus"
        ELSE "status"
      END,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = ${slotId}
      AND "status" = 'OPEN'::"BookingSlotStatus"
      AND "bookedCount" < "capacity"
    RETURNING id
  `;
  return rows.length > 0;
}

export async function releaseSlotSeat(
  tx: SlotCapacityTx,
  slotId: string,
): Promise<void> {
  await tx.$executeRaw`
    UPDATE booking_slots
    SET
      "bookedCount" = GREATEST("bookedCount" - 1, 0),
      "status" = CASE
        WHEN "status" = 'FULL'::"BookingSlotStatus"
          AND GREATEST("bookedCount" - 1, 0) < "capacity"
          THEN 'OPEN'::"BookingSlotStatus"
        ELSE "status"
      END,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = ${slotId}
  `;
}

export async function claimWaitingListSeat(
  tx: SlotCapacityTx,
  slotId: string,
): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    UPDATE booking_slots
    SET
      "waitingCount" = "waitingCount" + 1,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = ${slotId}
      AND "status" IN ('OPEN'::"BookingSlotStatus", 'FULL'::"BookingSlotStatus")
    RETURNING id
  `;
  return rows.length > 0;
}

export async function releaseWaitingListSeat(
  tx: SlotCapacityTx,
  slotId: string,
): Promise<void> {
  await tx.$executeRaw`
    UPDATE booking_slots
    SET
      "waitingCount" = GREATEST("waitingCount" - 1, 0),
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = ${slotId}
  `;
}

export function remainingCapacity(slot: {
  capacity: number;
  bookedCount: number;
  status: BookingSlotStatus;
}): number {
  if (
    slot.status === BookingSlotStatus.CLOSED ||
    slot.status === BookingSlotStatus.CANCELLED
  ) {
    return 0;
  }
  return Math.max(0, slot.capacity - slot.bookedCount);
}

export const SLOT_FULL_MESSAGE =
  "این بازه زمانی لحظاتی پیش تکمیل شد. لطفاً زمان دیگری انتخاب کنید.";
