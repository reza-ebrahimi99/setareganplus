/**
 * Per-promotion analytics for admin detail dashboard.
 */

import { prisma } from "@/lib/prisma";
import { toPersianDigits } from "@/lib/persian";

export type PromotionDailyPoint = {
  date: string;
  label: string;
  count: number;
  discountRials: number;
  revenueRials: number;
};

export type PromotionAnalytics = {
  totalUsage: number;
  successfulRegistrations: number;
  discountAmountRials: number;
  revenueRials: number;
  conversionRate: number;
  averageDiscountRials: number;
  remainingUsage: number | null;
  daily: PromotionDailyPoint[];
  topFlows: Array<{ flowKey: string; title: string; count: number }>;
  topSources: Array<{ key: string; count: number }>;
  topCampaigns: Array<{ key: string; count: number }>;
  topLandingPages: Array<{ key: string; count: number }>;
  topReferrers: Array<{
    ownerStaffId: string;
    name: string;
    count: number;
    salesRials: number;
  }>;
  recentUsages: Array<{
    id: string;
    registrationId: string;
    registrationNumber: string;
    nationalCode: string | null;
    discountAmount: number;
    usedAt: Date;
    finalAmountRials: number;
    flowKey: string;
  }>;
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getPromotionAnalytics(
  organizationId: string,
  promotionId: string,
): Promise<PromotionAnalytics | null> {
  const promo = await prisma.promotion.findFirst({
    where: { id: promotionId, organizationId, deletedAt: null },
    select: {
      id: true,
      usageLimit: true,
      usageCount: true,
      ownerStaffId: true,
      type: true,
    },
  });
  if (!promo) return null;

  const usages = await prisma.promotionUsage.findMany({
    where: { organizationId, promotionId },
    orderBy: { usedAt: "desc" },
    include: {
      registration: {
        select: {
          id: true,
          registrationNumber: true,
          finalAmountRials: true,
          amountRials: true,
          discountRials: true,
          flowKey: true,
          paymentStatus: true,
          status: true,
          deletedAt: true,
          productTitle: true,
          metadata: true,
        },
      },
      promotion: {
        select: {
          ownerStaffId: true,
          ownerStaff: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const live = usages.filter((u) => u.registration.deletedAt == null);
  const successful = live.filter(
    (u) =>
      u.registration.paymentStatus === "PAID" ||
      u.registration.status === "APPROVED" ||
      u.registration.status === "UNDER_REVIEW" ||
      u.registration.status === "WAITING_PAYMENT",
  );

  const discountAmountRials = live.reduce((s, u) => s + u.discountAmount, 0);
  const revenueRials = live.reduce(
    (s, u) => s + u.registration.finalAmountRials,
    0,
  );

  const dailyMap = new Map<string, PromotionDailyPoint>();
  for (const u of live) {
    const key = dayKey(u.usedAt);
    const existing = dailyMap.get(key) ?? {
      date: key,
      label: toPersianDigits(key),
      count: 0,
      discountRials: 0,
      revenueRials: 0,
    };
    existing.count += 1;
    existing.discountRials += u.discountAmount;
    existing.revenueRials += u.registration.finalAmountRials;
    dailyMap.set(key, existing);
  }
  const daily = [...dailyMap.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const flowMap = new Map<string, { flowKey: string; title: string; count: number }>();
  for (const u of live) {
    const key = u.registration.flowKey;
    const existing = flowMap.get(key) ?? {
      flowKey: key,
      title: u.registration.productTitle || key,
      count: 0,
    };
    existing.count += 1;
    flowMap.set(key, existing);
  }
  const topFlows = [...flowMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const { parseAttributionFromUnknown } = await import(
    "@/lib/registration/attribution"
  );
  const sourceMap = new Map<string, number>();
  const campaignMap = new Map<string, number>();
  const landingMap = new Map<string, number>();
  for (const u of live) {
    const attr = parseAttributionFromUnknown(u.registration.metadata);
    const source =
      attr?.acquisitionSource ||
      attr?.utmSource ||
      attr?.manualSource ||
      "direct";
    sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);
    const campaign =
      attr?.campaign || attr?.utmCampaign || attr?.referralCampaign || null;
    if (campaign) {
      campaignMap.set(campaign, (campaignMap.get(campaign) ?? 0) + 1);
    }
    if (attr?.landingPage) {
      landingMap.set(
        attr.landingPage,
        (landingMap.get(attr.landingPage) ?? 0) + 1,
      );
    }
  }
  const toTop = (map: Map<string, number>) =>
    [...map.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

  const referrerMap = new Map<
    string,
    { ownerStaffId: string; name: string; count: number; salesRials: number }
  >();
  for (const u of live) {
    const staff = u.promotion.ownerStaff;
    const staffId = u.promotion.ownerStaffId;
    if (!staffId || !staff) continue;
    const existing = referrerMap.get(staffId) ?? {
      ownerStaffId: staffId,
      name: `${staff.firstName} ${staff.lastName}`.trim(),
      count: 0,
      salesRials: 0,
    };
    existing.count += 1;
    existing.salesRials += u.registration.finalAmountRials;
    referrerMap.set(staffId, existing);
  }
  const topReferrers = [...referrerMap.values()]
    .sort((a, b) => b.salesRials - a.salesRials)
    .slice(0, 8);

  return {
    totalUsage: live.length,
    successfulRegistrations: successful.length,
    discountAmountRials,
    revenueRials,
    conversionRate: live.length > 0 ? successful.length / live.length : 0,
    averageDiscountRials:
      live.length > 0 ? Math.round(discountAmountRials / live.length) : 0,
    remainingUsage:
      promo.usageLimit != null
        ? Math.max(0, promo.usageLimit - promo.usageCount)
        : null,
    daily,
    topFlows,
    topSources: toTop(sourceMap),
    topCampaigns: toTop(campaignMap),
    topLandingPages: toTop(landingMap),
    topReferrers,
    recentUsages: live.slice(0, 20).map((u) => ({
      id: u.id,
      registrationId: u.registrationId,
      registrationNumber: u.registration.registrationNumber,
      nationalCode: u.nationalCode,
      discountAmount: u.discountAmount,
      usedAt: u.usedAt,
      finalAmountRials: u.registration.finalAmountRials,
      flowKey: u.registration.flowKey,
    })),
  };
}
