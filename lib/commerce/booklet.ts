/**
 * Booklet / physical catalog attribute labels (Persian UI).
 */

export const COMMERCE_PRINT_TYPES = ["COLOR", "BLACK_AND_WHITE"] as const;
export type CommercePrintTypeValue = (typeof COMMERCE_PRINT_TYPES)[number];

export const COMMERCE_BINDING_TYPES = [
  "STAPLED",
  "SPIRAL",
  "PERFECT",
  "OTHER",
] as const;
export type CommerceBindingTypeValue = (typeof COMMERCE_BINDING_TYPES)[number];

export const COMMERCE_FORMAT_SIZES = ["A4", "A5", "RAHLI", "OTHER"] as const;
export type CommerceFormatSizeValue = (typeof COMMERCE_FORMAT_SIZES)[number];

export const COMMERCE_FULFILLMENT_STATUSES = [
  "AWAITING_PICKUP",
  "DELIVERED",
  "CANCELLED",
] as const;
export type CommerceFulfillmentStatusValue =
  (typeof COMMERCE_FULFILLMENT_STATUSES)[number];

export const COMMERCE_PRINT_TYPE_LABELS: Record<CommercePrintTypeValue, string> =
  {
    COLOR: "رنگی",
    BLACK_AND_WHITE: "سیاه‌وسفید",
  };

export const COMMERCE_BINDING_TYPE_LABELS: Record<
  CommerceBindingTypeValue,
  string
> = {
  STAPLED: "منگنه",
  SPIRAL: "سیمی",
  PERFECT: "چسبی",
  OTHER: "سایر",
};

export const COMMERCE_FORMAT_SIZE_LABELS: Record<
  CommerceFormatSizeValue,
  string
> = {
  A4: "A4",
  A5: "A5",
  RAHLI: "رحلی",
  OTHER: "سایر",
};

export const COMMERCE_FULFILLMENT_STATUS_LABELS: Record<
  CommerceFulfillmentStatusValue,
  string
> = {
  AWAITING_PICKUP: "در انتظار تحویل حضوری",
  DELIVERED: "تحویل داده شد",
  CANCELLED: "لغو شده",
};

export const PICKUP_ONSITE_NOTICE =
  "این محصول ارسال پستی ندارد و فقط به‌صورت حضوری از مؤسسه آموزشی ستارگان تحویل می‌شود.";

export const PICKUP_ONSITE_SHORT =
  "تحویل حضوری از مؤسسه آموزشی ستارگان";

export function parseFeatureList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function featuresFromFormText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
