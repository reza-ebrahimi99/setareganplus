/**
 * Promotion + Referral reports.
 */

import { PromotionType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type PromotionReportRow = {
  id: string;
  title: string;
  code: string | null;
  type: string;
  usageCount: number;
  totalDiscountRials: number;
  /** Sum of registration finalAmountRials linked via usages. */
  revenueRials: number;
  /** Paid / completed-ish registrations / total usages (0–1). */
  conversionRate: number;
  isActive: boolean;
  ownerStaffName: string | null;
};

export type ReferralLeaderboardRow = {
  ownerStaffId: string;
  ownerStaffName: string;
  promotionCount: number;
  registrationCount: number;
  totalSalesRials: number;
  totalDiscountRials: number;
};

export async function getPromotionReports(
  organizationId: string,
): Promise<PromotionReportRow[]> {
  const promotions = await prisma.promotion.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: [{ type: "asc" }, { title: "asc" }],
    include: {
      ownerStaff: { select: { firstName: true, lastName: true } },
      usages: {
        select: {
          discountAmount: true,
          registration: {
            select: {
              finalAmountRials: true,
              paymentStatus: true,
              status: true,
              deletedAt: true,
            },
          },
        },
      },
    },
  });

  return promotions.map((promo) => {
    const liveUsages = promo.usages.filter(
      (u) => u.registration.deletedAt == null,
    );
    const totalDiscountRials = liveUsages.reduce(
      (sum, u) => sum + u.discountAmount,
      0,
    );
    const revenueRials = liveUsages.reduce(
      (sum, u) => sum + u.registration.finalAmountRials,
      0,
    );
    const converted = liveUsages.filter(
      (u) =>
        u.registration.paymentStatus === "PAID" ||
        u.registration.status === "APPROVED" ||
        u.registration.status === "UNDER_REVIEW",
    ).length;
    const conversionRate =
      liveUsages.length > 0 ? converted / liveUsages.length : 0;

    return {
      id: promo.id,
      title: promo.title,
      code: promo.code,
      type: promo.type,
      usageCount: liveUsages.length,
      totalDiscountRials,
      revenueRials,
      conversionRate,
      isActive: promo.isActive,
      ownerStaffName: promo.ownerStaff
        ? `${promo.ownerStaff.firstName} ${promo.ownerStaff.lastName}`.trim()
        : null,
    };
  });
}

export async function getReferralLeaderboard(
  organizationId: string,
): Promise<ReferralLeaderboardRow[]> {
  const referrals = await prisma.promotion.findMany({
    where: {
      organizationId,
      deletedAt: null,
      type: PromotionType.REFERRAL,
      ownerStaffId: { not: null },
    },
    include: {
      ownerStaff: { select: { id: true, firstName: true, lastName: true } },
      usages: {
        select: {
          discountAmount: true,
          registration: {
            select: { finalAmountRials: true, deletedAt: true },
          },
        },
      },
    },
  });

  const byOwner = new Map<string, ReferralLeaderboardRow>();

  for (const promo of referrals) {
    if (!promo.ownerStaffId || !promo.ownerStaff) continue;
    const live = promo.usages.filter((u) => u.registration.deletedAt == null);
    const existing = byOwner.get(promo.ownerStaffId) ?? {
      ownerStaffId: promo.ownerStaffId,
      ownerStaffName:
        `${promo.ownerStaff.firstName} ${promo.ownerStaff.lastName}`.trim(),
      promotionCount: 0,
      registrationCount: 0,
      totalSalesRials: 0,
      totalDiscountRials: 0,
    };
    existing.promotionCount += 1;
    existing.registrationCount += live.length;
    existing.totalSalesRials += live.reduce(
      (sum, u) => sum + u.registration.finalAmountRials,
      0,
    );
    existing.totalDiscountRials += live.reduce(
      (sum, u) => sum + u.discountAmount,
      0,
    );
    byOwner.set(promo.ownerStaffId, existing);
  }

  return [...byOwner.values()].sort(
    (a, b) => b.totalSalesRials - a.totalSalesRials,
  );
}
