/**
 * Load Promotion candidates from DB for pricing resolve.
 */

import { PromotionType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { parsePromotionRules } from "@/lib/promotions/rules";
import type { PromotionCandidate } from "@/lib/promotions/types";

function mapRow(row: {
  id: string;
  title: string;
  code: string | null;
  type: PromotionType;
  valueType: "PERCENT" | "FIXED";
  value: number;
  maxDiscountAmount: number | null;
  stackable: boolean;
  priority: number;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usageCount: number;
  usagePerNationalCode: number | null;
  isActive: boolean;
  registrationFlowId: string | null;
  ownerStaffId: string | null;
  metadata?: unknown;
}): PromotionCandidate {
  return {
    id: row.id,
    title: row.title,
    code: row.code,
    type: row.type,
    valueType: row.valueType,
    value: row.value,
    maxDiscountAmount: row.maxDiscountAmount,
    stackable: row.stackable,
    priority: row.priority,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    usageLimit: row.usageLimit,
    usageCount: row.usageCount,
    usagePerNationalCode: row.usagePerNationalCode,
    isActive: row.isActive,
    registrationFlowId: row.registrationFlowId,
    ownerStaffId: row.ownerStaffId,
    rules: parsePromotionRules(row.metadata),
  };
}

export async function loadPromotionCandidates(params: {
  organizationId: string;
  registrationFlowId: string | null;
  redeemCode?: string | null;
}): Promise<PromotionCandidate[]> {
  const redeem = (params.redeemCode ?? "").trim().toUpperCase() || null;

  const rows = await prisma.promotion.findMany({
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
      isActive: true,
      OR: [
        {
          type: { in: [PromotionType.TIMED, PromotionType.VIP] },
          OR: [
            { registrationFlowId: null },
            ...(params.registrationFlowId
              ? [{ registrationFlowId: params.registrationFlowId }]
              : []),
          ],
        },
        ...(redeem
          ? [
              {
                code: redeem,
                type: {
                  in: [
                    PromotionType.COUPON,
                    PromotionType.REFERRAL,
                    PromotionType.VIP,
                  ],
                },
              },
            ]
          : []),
      ],
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });

  return rows.map(mapRow);
}

export async function countNationalCodeUsages(params: {
  organizationId: string;
  nationalCode: string | null;
  promotionIds: string[];
}): Promise<Record<string, number>> {
  if (!params.nationalCode || params.promotionIds.length === 0) return {};

  const groups = await prisma.promotionUsage.groupBy({
    by: ["promotionId"],
    where: {
      organizationId: params.organizationId,
      nationalCode: params.nationalCode,
      promotionId: { in: params.promotionIds },
    },
    _count: { _all: true },
  });

  const out: Record<string, number> = {};
  for (const row of groups) {
    out[row.promotionId] = row._count._all;
  }
  return out;
}

export async function findPromotionByCode(params: {
  organizationId: string;
  code: string;
}): Promise<PromotionCandidate | null> {
  const code = params.code.trim().toUpperCase();
  if (!code) return null;
  const row = await prisma.promotion.findFirst({
    where: {
      organizationId: params.organizationId,
      code,
      deletedAt: null,
    },
  });
  return row ? mapRow(row) : null;
}
