/**
 * Registration number generator: REG-{jalaliYear}-{######}
 */

import { todayJalaliInTehran } from "@/lib/datetime/jalali";
import { prisma } from "@/lib/prisma";

export function formatRegistrationNumber(
  jalaliYear: number,
  sequence: number,
): string {
  return `REG-${jalaliYear}-${String(sequence).padStart(6, "0")}`;
}

export async function nextRegistrationNumber(params: {
  organizationId: string;
  jalaliYear?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any;
}): Promise<{ registrationNumber: string; jalaliYear: number; sequence: number }> {
  const client = params.tx ?? prisma;
  const jalaliYear = params.jalaliYear ?? todayJalaliInTehran().jy;

  const counter = await client.registrationNumberCounter.upsert({
    where: {
      organizationId_jalaliYear: {
        organizationId: params.organizationId,
        jalaliYear,
      },
    },
    create: {
      organizationId: params.organizationId,
      jalaliYear,
      lastSequence: 1,
    },
    update: {
      lastSequence: { increment: 1 },
    },
    select: { lastSequence: true },
  });

  return {
    jalaliYear,
    sequence: counter.lastSequence,
    registrationNumber: formatRegistrationNumber(
      jalaliYear,
      counter.lastSequence,
    ),
  };
}
