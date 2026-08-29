/**
 * Deterministic (rule-based) booking recommendations.
 * AI may explain/rank these but must not invent availability.
 */

import { BookingSlotStatus } from "@/generated/prisma/enums";
import { formatJalaliDateLong, formatPersianTimeRange } from "@/lib/datetime/jalali";
import { remainingCapacity } from "@/lib/booking/slot-capacity";
import { prisma } from "@/lib/prisma";
import { toPersianDigits } from "@/lib/persian";

export type SlotSuggestion = {
  slotId: string;
  advisorId: string;
  advisorName: string;
  startsAt: Date;
  endsAt: Date;
  remaining: number;
  label: string;
  reason: string;
};

export async function recommendSlots(params: {
  organizationId: string;
  serviceId: string;
  advisorId?: string | null;
  limit?: number;
}): Promise<SlotSuggestion[]> {
  const limit = params.limit ?? 5;
  const now = new Date();

  const slots = await prisma.bookingSlot.findMany({
    where: {
      organizationId: params.organizationId,
      serviceId: params.serviceId,
      status: BookingSlotStatus.OPEN,
      startsAt: { gte: now },
      ...(params.advisorId ? { advisorId: params.advisorId } : {}),
    },
    include: {
      advisor: { select: { id: true, displayName: true } },
    },
    orderBy: [{ startsAt: "asc" }],
    take: 80,
  });

  const scored = slots
    .map((slot) => {
      const remaining = remainingCapacity(slot);
      if (remaining <= 0) return null;
      const utilization = slot.bookedCount / Math.max(slot.capacity, 1);
      // Prefer earlier + lower utilization (quieter)
      const score = slot.startsAt.getTime() / 1e12 + utilization;
      return { slot, remaining, score };
    })
    .filter((item): item is NonNullable<typeof item> => item != null)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);

  return scored.map(({ slot, remaining }, index) => ({
    slotId: slot.id,
    advisorId: slot.advisor.id,
    advisorName: slot.advisor.displayName,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    remaining,
    label: `${formatJalaliDateLong(slot.startsAt)} · ${formatPersianTimeRange(slot.startsAt, slot.endsAt)}`,
    reason:
      index === 0
        ? "زودترین نوبت مناسب"
        : remaining >= 2
          ? `ظرفیت بیشتر (باقی‌مانده ${toPersianDigits(remaining)})`
          : "نوبت جایگزین",
  }));
}

export function buildPersianRecommendationMessage(
  suggestions: SlotSuggestion[],
  exhaustedLabel?: string,
): string {
  if (suggestions.length === 0) {
    return (
      exhaustedLabel ??
      "در بازه نزدیک نوبت آزادی یافت نشد. لیست انتظار یا روز دیگری را بررسی کنید."
    );
  }
  const primary = suggestions[0];
  const alt = suggestions[1];
  if (!alt) {
    return `پیشنهاد: ${primary.label} با ${primary.advisorName}.`;
  }
  return `پیشنهاد: ${primary.label}؛ یا ${alt.label} با ${alt.advisorName}.`;
}
