/**
 * Keep a DB TIMED Promotion in sync with RegistrationFlow timed-discount fields
 * so admin reports and the Promotion list stay aligned without breaking flows.
 */

import { PromotionType, PromotionValueType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const SYNC_MARKER = "syncedFromRegistrationFlow";

export async function syncTimedPromotionFromRegistrationFlow(params: {
  organizationId: string;
  registrationFlowId: string;
  title: string;
  paymentAmountRials: number;
  saleAmountRials: number | null;
  pricingBadge: string | null;
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
  isFree: boolean;
}): Promise<void> {
  const existing = await prisma.promotion.findFirst({
    where: {
      organizationId: params.organizationId,
      registrationFlowId: params.registrationFlowId,
      type: PromotionType.TIMED,
      deletedAt: null,
      code: null,
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const saleOk =
    !params.isFree &&
    params.saleAmountRials != null &&
    Number.isInteger(params.saleAmountRials) &&
    params.saleAmountRials >= 0 &&
    params.saleAmountRials < params.paymentAmountRials;

  if (!saleOk) {
    if (existing) {
      await prisma.promotion.update({
        where: { id: existing.id },
        data: { isActive: false },
      });
    }
    return;
  }

  const discountValue = Math.max(
    0,
    params.paymentAmountRials - params.saleAmountRials!,
  );
  const title =
    params.pricingBadge?.trim() ||
    `تخفیف زمان‌دار — ${params.title}`.slice(0, 120);

  const metadata = {
    [SYNC_MARKER]: true,
    saleAmountRials: params.saleAmountRials,
    paymentAmountRials: params.paymentAmountRials,
  } satisfies Prisma.InputJsonObject;

  if (existing) {
    await prisma.promotion.update({
      where: { id: existing.id },
      data: {
        title,
        valueType: PromotionValueType.FIXED,
        value: discountValue,
        startsAt: params.discountStartsAt,
        endsAt: params.discountEndsAt,
        isActive: true,
        stackable: true,
        priority: 0,
        metadata,
      },
    });
    return;
  }

  await prisma.promotion.create({
    data: {
      organizationId: params.organizationId,
      title,
      code: null,
      type: PromotionType.TIMED,
      valueType: PromotionValueType.FIXED,
      value: discountValue,
      stackable: true,
      priority: 0,
      startsAt: params.discountStartsAt,
      endsAt: params.discountEndsAt,
      isActive: true,
      registrationFlowId: params.registrationFlowId,
      metadata,
    },
  });
}
