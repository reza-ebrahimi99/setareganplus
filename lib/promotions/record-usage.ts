/**
 * Persist PromotionUsage rows + increment usageCount after registration create.
 */

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { AppliedPromotionLine } from "@/lib/promotions/types";

export async function recordPromotionUsages(params: {
  organizationId: string;
  registrationId: string;
  nationalCode: string | null;
  applied: AppliedPromotionLine[];
}): Promise<void> {
  const real = params.applied.filter((line) => !line.virtual && line.discountAmountRials > 0);
  if (real.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const line of real) {
      const existing = await tx.promotionUsage.findFirst({
        where: {
          promotionId: line.promotionId,
          registrationId: params.registrationId,
        },
        select: { id: true },
      });
      if (existing) continue;

      try {
        await tx.promotionUsage.create({
          data: {
            organizationId: params.organizationId,
            promotionId: line.promotionId,
            registrationId: params.registrationId,
            nationalCode: params.nationalCode,
            discountAmount: line.discountAmountRials,
          },
        });
        await tx.promotion.update({
          where: { id: line.promotionId },
          data: { usageCount: { increment: 1 } },
        });
      } catch (error) {
        // Unique (promotionId, registrationId) — concurrent duplicate
        const message = error instanceof Error ? error.message : "";
        if (!message.includes("Unique") && !message.includes("unique")) {
          throw error;
        }
      }
    }
  });
}

export function appliedPromotionsMetadata(
  applied: AppliedPromotionLine[],
  extra?: {
    referralPromotionId?: string | null;
    referralOwnerStaffId?: string | null;
  },
): Prisma.InputJsonObject {
  const items = applied.map((line) => ({
    promotionId: line.promotionId,
    title: line.title,
    code: line.code,
    type: line.type,
    discountAmountRials: line.discountAmountRials,
    virtual: Boolean(line.virtual),
    ownerStaffId: line.ownerStaffId,
  }));
  return {
    appliedPromotionsSchemaVersion: 1,
    appliedPromotions: items,
    appliedPromotionsBag: {
      schemaVersion: 1,
      items,
      referralPromotionId: extra?.referralPromotionId ?? null,
      referralOwnerStaffId: extra?.referralOwnerStaffId ?? null,
    },
    referralPromotionId: extra?.referralPromotionId ?? null,
    referralOwnerStaffId: extra?.referralOwnerStaffId ?? null,
  };
}
