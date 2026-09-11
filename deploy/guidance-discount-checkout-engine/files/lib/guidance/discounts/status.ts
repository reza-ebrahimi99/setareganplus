export type GuidanceDiscountDerivedStatus =
  | "active"
  | "inactive"
  | "not_started"
  | "expired"
  | "exhausted";

export const GUIDANCE_DISCOUNT_STATUS_LABELS: Record<
  GuidanceDiscountDerivedStatus,
  string
> = {
  active: "فعال",
  inactive: "غیرفعال",
  not_started: "شروع‌نشده",
  expired: "منقضی",
  exhausted: "تکمیل ظرفیت",
};

export function deriveGuidanceDiscountStatus(params: {
  isActive: boolean;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  maxUses: number | null;
  usageCount: number;
  now?: Date;
}): GuidanceDiscountDerivedStatus {
  const now = params.now ?? new Date();
  if (!params.isActive) return "inactive";
  const startsAt = params.startsAt ? new Date(params.startsAt) : null;
  const endsAt = params.endsAt ? new Date(params.endsAt) : null;
  if (startsAt && !Number.isNaN(startsAt.getTime()) && now < startsAt) {
    return "not_started";
  }
  if (endsAt && !Number.isNaN(endsAt.getTime()) && now > endsAt) {
    return "expired";
  }
  if (params.maxUses != null && params.usageCount >= params.maxUses) {
    return "exhausted";
  }
  return "active";
}
