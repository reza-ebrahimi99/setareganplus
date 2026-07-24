/**
 * Server-only RegistrationFlow DB accessors.
 * Maps catalog flowKey onto Registration Management slug/lifecycle/payment columns.
 */

import {
  RegistrationFlowLifecycle,
  RegistrationFlowPaymentMode,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getRegistrationCatalog } from "@/lib/registration/catalog-registry";
import {
  parseAdminSmsRecipients,
  parseRegistrationFlowSettings,
  type RegistrationFlowConfig,
  type RegistrationFlowRowLike,
} from "@/lib/registration/flow-config";
import { normalizeRegistrationFlowSlug } from "@/lib/registration/flows/slug";

function mapFlowRow(row: RegistrationFlowRowLike): RegistrationFlowConfig {
  return {
    id: row.id,
    organizationId: row.organizationId,
    flowKey: row.slug,
    title: row.title,
    subtitle: row.description || null,
    productType: row.productType,
    isActive: row.lifecycle === RegistrationFlowLifecycle.ACTIVE,
    baseAmountRials: row.paymentAmountRials,
    saleAmountRials: row.saleAmountRials,
    pricingBadge: row.pricingBadge,
    isFree: row.paymentMode === RegistrationFlowPaymentMode.FREE,
    discountStartsAt: row.discountStartsAt,
    discountEndsAt: row.discountEndsAt,
    showDiscountCountdown: row.showDiscountCountdown,
    registrationStartsAt: row.opensAt,
    registrationEndsAt: row.closesAt,
    capacity: row.capacity,
    bookedCount: row._count?.registrations ?? 0,
    showRemainingCapacity: row.showRemainingCapacity,
    confirmationSmsEnabled: row.confirmationSmsEnabled,
    adminNotificationSmsEnabled: row.adminNotificationSmsEnabled,
    smsTemplateCode: row.smsTemplateCode,
    adminSmsRecipients: parseAdminSmsRecipients(row.adminSmsRecipients),
    settings: parseRegistrationFlowSettings(row.metadata),
  };
}

const flowSelect = {
  id: true,
  organizationId: true,
  slug: true,
  title: true,
  description: true,
  productType: true,
  lifecycle: true,
  paymentMode: true,
  paymentAmountRials: true,
  saleAmountRials: true,
  pricingBadge: true,
  discountStartsAt: true,
  discountEndsAt: true,
  showDiscountCountdown: true,
  opensAt: true,
  closesAt: true,
  capacity: true,
  showRemainingCapacity: true,
  confirmationSmsEnabled: true,
  adminNotificationSmsEnabled: true,
  smsTemplateCode: true,
  adminSmsRecipients: true,
  metadata: true,
  _count: { select: { registrations: true } },
} as const;

/** Ensure a DB row exists for a known catalog flow (idempotent upsert by slug). */
export async function ensureRegistrationFlowConfig(params: {
  organizationId: string;
  flowKey: string;
}): Promise<RegistrationFlowConfig> {
  const catalog = getRegistrationCatalog(params.flowKey);
  if (!catalog) {
    throw new Error(`Unknown registration flowKey: ${params.flowKey}`);
  }

  const slug = normalizeRegistrationFlowSlug(catalog.flowKey);

  const existing = await prisma.registrationFlow.findFirst({
    where: {
      organizationId: params.organizationId,
      slug,
      deletedAt: null,
    },
    select: flowSelect,
  });
  if (existing) {
    return mapFlowRow(existing as RegistrationFlowRowLike);
  }

  const defaultPackage = catalog.packages[0];
  const created = await prisma.registrationFlow.upsert({
    where: {
      organizationId_slug: {
        organizationId: params.organizationId,
        slug,
      },
    },
    create: {
      organizationId: params.organizationId,
      slug,
      title: catalog.title,
      description: catalog.subtitle ?? "",
      productType: catalog.productType,
      lifecycle: RegistrationFlowLifecycle.ACTIVE,
      paymentMode: RegistrationFlowPaymentMode.FIXED_PRICE,
      paymentAmountRials: defaultPackage?.amountRials ?? 0,
      saleAmountRials: null,
      showDiscountCountdown: true,
      showRemainingCapacity: true,
      metadata: {},
      adminSmsRecipients: [],
    },
    update: {
      deletedAt: null,
      title: catalog.title,
      description: catalog.subtitle ?? "",
      productType: catalog.productType,
      lifecycle: RegistrationFlowLifecycle.ACTIVE,
    },
    select: flowSelect,
  });

  return mapFlowRow(created as RegistrationFlowRowLike);
}

export async function getRegistrationFlowConfig(params: {
  organizationId: string;
  flowKey: string;
}): Promise<RegistrationFlowConfig | null> {
  const slug = normalizeRegistrationFlowSlug(params.flowKey);
  const row = await prisma.registrationFlow.findFirst({
    where: {
      organizationId: params.organizationId,
      slug,
      deletedAt: null,
    },
    select: flowSelect,
  });
  return row ? mapFlowRow(row as RegistrationFlowRowLike) : null;
}
