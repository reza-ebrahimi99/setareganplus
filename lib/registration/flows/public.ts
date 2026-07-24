import {
  MediaAssetStatus,
  RegistrationFlowLifecycle,
  RegistrationFlowPaymentMode,
  type RegistrationFlowPaymentMode as RegistrationFlowPaymentModeValue,
  type RegistrationProductType,
} from "@/generated/prisma/enums";
import { publicUrlForStorageKey } from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";
import {
  FLOW_PAYMENT_MODE_LABELS,
  flowRequiresCheckout,
} from "@/lib/registration/flows/constants";
import type { RegistrationFlowCatalog } from "@/lib/registration/types";
import { resolveTimedDiscountPricing } from "@/lib/registration/timed-discount";

export type PublicRegistrationFlow = {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  description: string;
  coverUrl: string | null;
  productType: RegistrationProductType;
  academicYear: string | null;
  gradeTargets: string | null;
  courseTarget: string | null;
  capacity: number | null;
  paymentMode: RegistrationFlowPaymentModeValue;
  paymentAmountRials: number;
  paymentTitle: string | null;
  paymentDeadlineAt: Date | null;
  saleAmountRials: number | null;
  pricingBadge: string | null;
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
  showDiscountCountdown: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  formId: string | null;
  formSlug: string | null;
  formTitle: string | null;
  steps: Array<{
    stepKey: string;
    label: string;
    enabled: boolean;
    sortOrder: number;
  }>;
  documentRequirements: Array<{
    requirementKey: string;
    title: string;
    helpText: string;
    required: boolean;
    acceptedMimeTypes: string;
    maxSizeBytes: number;
  }>;
  isOpen: boolean;
  closedReason: "draft" | "archived" | "not_started" | "ended" | "full" | null;
  /** Resolved at load time (server). Client may re-resolve on countdown expiry. */
  pricing: {
    amountRials: number;
    finalAmountRials: number;
    discountRials: number;
    discountActive: boolean;
    pricingBadge: string | null;
    discountEndsAtIso: string | null;
    showCountdown: boolean;
    discountPercent: number | null;
  };
};

function evaluateOpenWindow(flow: {
  lifecycle: string;
  opensAt: Date | null;
  closesAt: Date | null;
  capacity: number | null;
  registrationCount: number;
}): { isOpen: boolean; closedReason: PublicRegistrationFlow["closedReason"] } {
  if (flow.lifecycle === RegistrationFlowLifecycle.DRAFT) {
    return { isOpen: false, closedReason: "draft" };
  }
  if (flow.lifecycle === RegistrationFlowLifecycle.ARCHIVED) {
    return { isOpen: false, closedReason: "archived" };
  }
  const now = Date.now();
  if (flow.opensAt && flow.opensAt.getTime() > now) {
    return { isOpen: false, closedReason: "not_started" };
  }
  if (flow.closesAt && flow.closesAt.getTime() < now) {
    return { isOpen: false, closedReason: "ended" };
  }
  if (
    flow.capacity != null &&
    flow.capacity > 0 &&
    flow.registrationCount >= flow.capacity
  ) {
    return { isOpen: false, closedReason: "full" };
  }
  return { isOpen: true, closedReason: null };
}

export async function loadPublicRegistrationFlowBySlug(
  slug: string,
  options?: { allowPreview?: boolean },
): Promise<PublicRegistrationFlow | null> {
  const row = await prisma.registrationFlow.findFirst({
    where: {
      slug,
      deletedAt: null,
      ...(options?.allowPreview
        ? {}
        : { lifecycle: RegistrationFlowLifecycle.ACTIVE }),
    },
    include: {
      coverMedia: {
        select: {
          storageKey: true,
          deletedAt: true,
          status: true,
        },
      },
      form: {
        select: {
          slug: true,
          publishedVersion: { select: { title: true } },
        },
      },
      steps: { orderBy: { sortOrder: "asc" } },
      documentRequirements: {
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { registrations: true } },
    },
  });

  if (!row) return null;

  const { isOpen, closedReason } = evaluateOpenWindow({
    lifecycle: row.lifecycle,
    opensAt: row.opensAt,
    closesAt: row.closesAt,
    capacity: row.capacity,
    registrationCount: row._count.registrations,
  });

  const coverActive =
    row.coverMedia &&
    row.coverMedia.deletedAt == null &&
    row.coverMedia.status === MediaAssetStatus.ACTIVE;

  const isFree = row.paymentMode === RegistrationFlowPaymentMode.FREE;
  const timed = resolveTimedDiscountPricing({
    paymentAmountRials: row.paymentAmountRials,
    saleAmountRials: row.saleAmountRials,
    discountStartsAt: row.discountStartsAt,
    discountEndsAt: row.discountEndsAt,
    pricingBadge: row.pricingBadge,
    showDiscountCountdown: row.showDiscountCountdown,
    isFree,
  });

  return {
    id: row.id,
    organizationId: row.organizationId,
    title: row.title,
    slug: row.slug,
    description: row.description,
    coverUrl:
      coverActive && row.coverMedia
        ? publicUrlForStorageKey(row.coverMedia.storageKey)
        : null,
    productType: row.productType,
    academicYear: row.academicYear,
    gradeTargets: row.gradeTargets,
    courseTarget: row.courseTarget,
    capacity: row.capacity,
    paymentMode: row.paymentMode,
    paymentAmountRials: row.paymentAmountRials,
    paymentTitle: row.paymentTitle,
    paymentDeadlineAt: row.paymentDeadlineAt,
    saleAmountRials: row.saleAmountRials,
    pricingBadge: row.pricingBadge,
    discountStartsAt: row.discountStartsAt,
    discountEndsAt: row.discountEndsAt,
    showDiscountCountdown: row.showDiscountCountdown,
    opensAt: row.opensAt,
    closesAt: row.closesAt,
    formId: row.formId,
    formSlug: row.form?.slug ?? null,
    formTitle: row.form?.publishedVersion?.title ?? row.form?.slug ?? null,
    steps: row.steps.map((s) => ({
      stepKey: s.stepKey,
      label: s.label,
      enabled: s.enabled,
      sortOrder: s.sortOrder,
    })),
    documentRequirements: row.documentRequirements.map((d) => ({
      requirementKey: d.requirementKey,
      title: d.title,
      helpText: d.helpText,
      required: d.required,
      acceptedMimeTypes: d.acceptedMimeTypes,
      maxSizeBytes: d.maxSizeBytes,
    })),
    isOpen: options?.allowPreview ? true : isOpen,
    closedReason: options?.allowPreview ? null : closedReason,
    pricing: {
      amountRials: timed.amountRials,
      finalAmountRials: timed.finalAmountRials,
      discountRials: timed.discountRials,
      discountActive: timed.discountActive,
      pricingBadge: timed.pricingBadge,
      discountEndsAtIso: timed.discountEndsAt?.toISOString() ?? null,
      showCountdown: timed.showCountdown,
      discountPercent: timed.discountPercent,
    },
  };
}

/** Build a Registration Engine catalog from a DB-managed flow. */
export function catalogFromRegistrationFlow(
  flow: PublicRegistrationFlow,
): RegistrationFlowCatalog {
  const productKey = flow.courseTarget
    ? `course-${flow.slug}`
    : `product-${flow.slug}`;
  const needsAmount = flowRequiresCheckout(flow.paymentMode);
  const packageKey = needsAmount ? `pkg-${flow.slug}` : `free-${flow.slug}`;
  const amount = needsAmount ? flow.paymentAmountRials : 0;
  const modeLabel = FLOW_PAYMENT_MODE_LABELS[flow.paymentMode];

  return {
    flowKey: flow.slug,
    productType: flow.productType,
    title: flow.title,
    subtitle: flow.description || "ثبت‌نام آنلاین",
    products: [
      {
        key: productKey,
        title: flow.courseTarget || flow.title,
        description: flow.gradeTargets || undefined,
      },
    ],
    sessions: [
      {
        key: `session-${flow.slug}`,
        title: flow.academicYear
          ? `سال تحصیلی ${flow.academicYear}`
          : "نوبت ثبت‌نام",
      },
    ],
    packages: [
      {
        key: packageKey,
        title:
          flow.paymentTitle ||
          (flow.paymentMode === RegistrationFlowPaymentMode.DEPOSIT
            ? `بیعانه (${modeLabel})`
            : flow.paymentMode === RegistrationFlowPaymentMode.FREE
              ? "رایگان"
              : "مبلغ ثبت‌نام"),
        description: modeLabel,
        amountRials: amount,
      },
    ],
    venueBranches: [
      {
        key: "default-branch",
        title: "نمایندگی اصلی",
      },
    ],
    discountCodes: {},
  };
}

export async function getDbRegistrationCatalog(
  flowKey: string,
): Promise<RegistrationFlowCatalog | null> {
  const flow = await loadPublicRegistrationFlowBySlug(flowKey, {
    allowPreview: false,
  });
  if (!flow) return null;
  return catalogFromRegistrationFlow(flow);
}

export async function findRegistrationFlowBySlug(
  organizationId: string,
  slug: string,
): Promise<{
  id: string;
  paymentMode: RegistrationFlowPaymentModeValue;
  paymentAmountRials: number;
  paymentTitle: string | null;
} | null> {
  return prisma.registrationFlow.findFirst({
    where: {
      organizationId,
      slug,
      deletedAt: null,
    },
    select: {
      id: true,
      paymentMode: true,
      paymentAmountRials: true,
      paymentTitle: true,
    },
  });
}
