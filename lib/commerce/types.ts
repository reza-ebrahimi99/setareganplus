/**
 * Commerce Foundation types.
 * Catalog entity is CommerceItem; admin UX label remains «محصولات».
 */

export const PAYMENT_PAYABLE_TYPES = [
  "REGISTRATION",
  "COMMERCE_ORDER",
  // Guidance Journey Engine Step 3 — verified by its own dedicated flow
  // (lib/guidance/journey/payment.ts), not by validatePayableTarget() /
  // the shared startCheckout*/verifyPaymentCallback() below.
  "GUIDANCE_PACKAGE",
  "BOOKING",
  "TUITION",
  "INSTALLMENT",
] as const;

export type PaymentPayableTypeValue = (typeof PAYMENT_PAYABLE_TYPES)[number];

/** Payable types that are wired for intent creation in this phase. */
export const ACTIVE_PAYMENT_PAYABLE_TYPES = [
  "REGISTRATION",
  "COMMERCE_ORDER",
] as const satisfies ReadonlyArray<PaymentPayableTypeValue>;

export type ActivePaymentPayableType = (typeof ACTIVE_PAYMENT_PAYABLE_TYPES)[number];

export const COMMERCE_SYSTEM_KINDS = [
  "PHYSICAL",
  "DIGITAL",
  "COURSE",
  "EVENT",
  "EXAM",
  "CONSULTING",
  "SERVICE",
  "CUSTOM",
] as const;

export type CommerceSystemKindValue = (typeof COMMERCE_SYSTEM_KINDS)[number];

export const COMMERCE_ITEM_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "OUT_OF_STOCK",
  "ARCHIVED",
] as const;
export type CommerceItemStatusValue = (typeof COMMERCE_ITEM_STATUSES)[number];

export type CommerceCategorySeedDefinition = {
  seedKey: string;
  title: string;
  slug: string;
  sortOrder: number;
  parentSeedKey?: string;
};

/** Editable seed definitions (never hardcoded as runtime category IDs). */
export const COMMERCE_CATEGORY_SEED: readonly CommerceCategorySeedDefinition[] = [
  { seedKey: "books", title: "جزوات و کتاب‌ها", slug: "jozveh-va-ketabha", sortOrder: 10 },
  { seedKey: "courses", title: "دوره‌های آموزشی", slug: "dorehaye-amoozeshi", sortOrder: 20 },
  {
    seedKey: "courses-inperson",
    title: "حضوری",
    slug: "hozouri",
    sortOrder: 21,
    parentSeedKey: "courses",
  },
  {
    seedKey: "courses-online",
    title: "آنلاین",
    slug: "online",
    sortOrder: 22,
    parentSeedKey: "courses",
  },
  { seedKey: "exams", title: "آزمون", slug: "azmoon", sortOrder: 30 },
  {
    seedKey: "events",
    title: "رویدادها و همایش‌ها",
    slug: "roydadha-va-hamayeshha",
    sortOrder: 40,
  },
  {
    seedKey: "consulting",
    title: "مشاوره تحصیلی",
    slug: "moshavere-tahsili",
    sortOrder: 50,
  },
  { seedKey: "other", title: "سایر", slug: "sayer", sortOrder: 60 },
];

export type FulfillmentHints = {
  requiresShipping: boolean;
  grantsDigitalAccess: boolean;
  requiresScheduling: boolean;
  requiresEnrollment: boolean;
};

export function defaultFulfillmentHints(
  systemKind: CommerceSystemKindValue,
): FulfillmentHints {
  switch (systemKind) {
    case "PHYSICAL":
      // Institute MVP: physical goods are on-site pickup only (no postal shipping).
      return {
        requiresShipping: false,
        grantsDigitalAccess: false,
        requiresScheduling: false,
        requiresEnrollment: false,
      };
    case "DIGITAL":
      return {
        requiresShipping: false,
        grantsDigitalAccess: true,
        requiresScheduling: false,
        requiresEnrollment: false,
      };
    case "COURSE":
      return {
        requiresShipping: false,
        grantsDigitalAccess: false,
        requiresScheduling: false,
        requiresEnrollment: true,
      };
    case "EVENT":
    case "EXAM":
      return {
        requiresShipping: false,
        grantsDigitalAccess: false,
        requiresScheduling: false,
        requiresEnrollment: true,
      };
    case "CONSULTING":
      return {
        requiresShipping: false,
        grantsDigitalAccess: false,
        requiresScheduling: true,
        requiresEnrollment: false,
      };
    case "SERVICE":
    case "CUSTOM":
    default:
      return {
        requiresShipping: false,
        grantsDigitalAccess: false,
        requiresScheduling: false,
        requiresEnrollment: false,
      };
  }
}
