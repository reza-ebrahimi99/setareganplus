/**
 * Server-only RegistrationFlow DB accessors.
 * Maps flowKey/slug onto Registration Management lifecycle/payment columns.
 *
 * Resolution order for ensure/resolve:
 * 1. Existing DB RegistrationFlow row (CMS / published flows) by org + slug
 * 2. Legacy static catalog seed (e.g. qalamchi-exam) when no DB row exists
 * Never require the static registry for DB-managed slugs.
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

/**
 * Resolve flow config from DB first; seed from static catalog only when missing.
 * Returns null when neither a DB row nor a legacy catalog entry exists.
 */
export async function resolveRegistrationFlowConfig(params: {
  organizationId: string;
  flowKey: string;
}): Promise<RegistrationFlowConfig | null> {
  const slug = normalizeRegistrationFlowSlug(params.flowKey);

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

  const catalog = getRegistrationCatalog(params.flowKey);
  if (!catalog) {
    return null;
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

/**
 * Ensure a flow config exists (DB row or legacy catalog seed).
 * Prefer resolveRegistrationFlowConfig in public submit paths for soft failure.
 */
export async function ensureRegistrationFlowConfig(params: {
  organizationId: string;
  flowKey: string;
}): Promise<RegistrationFlowConfig> {
  const config = await resolveRegistrationFlowConfig(params);
  if (!config) {
    throw new Error(`Unknown registration flowKey: ${params.flowKey}`);
  }
  return config;
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
