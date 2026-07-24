import {
  FormVersionStatus,
  MediaAssetStatus,
  RegistrationDocumentType,
  RegistrationFlowLifecycle,
  RegistrationFlowPaymentMode,
  RegistrationProductType,
  type RegistrationDocumentType as RegistrationDocumentTypeValue,
  type RegistrationFlowLifecycle as RegistrationFlowLifecycleValue,
  type RegistrationFlowPaymentMode as RegistrationFlowPaymentModeValue,
  type RegistrationFlowStepKey as RegistrationFlowStepKeyValue,
  type RegistrationProductType as RegistrationProductTypeValue,
} from "@/generated/prisma/enums";
import { publicUrlForStorageKey } from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ACCEPTED_MIME,
  DEFAULT_FLOW_STEPS,
  DEFAULT_MAX_FILE_BYTES,
} from "@/lib/registration/flows/constants";
import {
  normalizeRegistrationFlowSlug,
  slugFromRegistrationFlowTitle,
} from "@/lib/registration/flows/slug";

export function isRegistrationFlowPaymentMode(
  value: string,
): value is RegistrationFlowPaymentModeValue {
  return Object.values(RegistrationFlowPaymentMode).includes(
    value as RegistrationFlowPaymentModeValue,
  );
}

export type RegistrationFlowListItem = {
  id: string;
  title: string;
  slug: string;
  lifecycle: RegistrationFlowLifecycleValue;
  productType: RegistrationProductTypeValue;
  formTitle: string | null;
  paymentMode: RegistrationFlowPaymentModeValue;
  paymentAmountRials: number;
  capacity: number | null;
  opensAt: Date | null;
  closesAt: Date | null;
  publishedAt: Date | null;
  updatedAt: Date;
  registrationCount: number;
};

export type FlowFormPreviewQuestion = {
  fieldKey: string;
  label: string;
  type: string;
  required: boolean;
  helpText: string | null;
};

export type RegistrationFlowDetail = {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverMediaId: string | null;
  coverUrl: string | null;
  lifecycle: RegistrationFlowLifecycleValue;
  productType: RegistrationProductTypeValue;
  formId: string | null;
  formTitle: string | null;
  formSlug: string | null;
  opensAt: Date | null;
  closesAt: Date | null;
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
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  steps: Array<{
    id: string;
    stepKey: RegistrationFlowStepKeyValue;
    label: string;
    enabled: boolean;
    sortOrder: number;
  }>;
  documentRequirements: Array<{
    id: string;
    requirementKey: string;
    title: string;
    helpText: string;
    documentType: RegistrationDocumentTypeValue;
    required: boolean;
    acceptedMimeTypes: string;
    maxSizeBytes: number;
    sortOrder: number;
  }>;
  formPreview: FlowFormPreviewQuestion[];
  registrationCount: number;
};

async function uniqueFlowSlug(
  organizationId: string,
  preferred: string,
  excludeId?: string,
): Promise<string> {
  const base = normalizeRegistrationFlowSlug(preferred);
  let candidate = base;
  let n = 2;
  for (;;) {
    const existing = await prisma.registrationFlow.findFirst({
      where: {
        organizationId,
        slug: candidate,
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
}

export async function listRegistrationFlows(
  organizationId: string,
): Promise<RegistrationFlowListItem[]> {
  const rows = await prisma.registrationFlow.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      lifecycle: true,
      productType: true,
      paymentMode: true,
      paymentAmountRials: true,
      capacity: true,
      opensAt: true,
      closesAt: true,
      publishedAt: true,
      updatedAt: true,
      form: {
        select: {
          slug: true,
          publishedVersion: { select: { title: true } },
        },
      },
      _count: { select: { registrations: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    lifecycle: row.lifecycle,
    productType: row.productType,
    formTitle: row.form?.publishedVersion?.title ?? row.form?.slug ?? null,
    paymentMode: row.paymentMode,
    paymentAmountRials: row.paymentAmountRials,
    capacity: row.capacity,
    opensAt: row.opensAt,
    closesAt: row.closesAt,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    registrationCount: row._count.registrations,
  }));
}

async function loadFormPreview(
  organizationId: string,
  formId: string | null,
): Promise<FlowFormPreviewQuestion[]> {
  if (!formId) return [];

  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      organizationId,
      deletedAt: null,
      publishedVersionId: { not: null },
    },
    select: {
      publishedVersion: {
        select: {
          status: true,
          fields: {
            orderBy: { sortOrder: "asc" },
            select: {
              fieldKey: true,
              label: true,
              type: true,
              required: true,
              helpText: true,
            },
          },
        },
      },
    },
  });

  if (
    !form?.publishedVersion ||
    form.publishedVersion.status !== FormVersionStatus.PUBLISHED
  ) {
    return [];
  }

  return form.publishedVersion.fields.map((f) => ({
    fieldKey: f.fieldKey,
    label: f.label,
    type: f.type,
    required: f.required,
    helpText: f.helpText,
  }));
}

export async function getRegistrationFlowDetail(
  organizationId: string,
  flowId: string,
): Promise<RegistrationFlowDetail | null> {
  const row = await prisma.registrationFlow.findFirst({
    where: { id: flowId, organizationId, deletedAt: null },
    include: {
      coverMedia: {
        select: {
          id: true,
          storageKey: true,
          deletedAt: true,
          status: true,
        },
      },

      form: {
        select: {
          id: true,
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

  const formPreview = await loadFormPreview(organizationId, row.formId);

  const coverActive =
    row.coverMedia &&
    row.coverMedia.deletedAt == null &&
    row.coverMedia.status === MediaAssetStatus.ACTIVE;

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    coverMediaId: row.coverMediaId,
    coverUrl:
      coverActive && row.coverMedia
        ? publicUrlForStorageKey(row.coverMedia.storageKey)
        : null,
    lifecycle: row.lifecycle,
    productType: row.productType,
    formId: row.formId,
    formTitle: row.form?.publishedVersion?.title ?? row.form?.slug ?? null,
    formSlug: row.form?.slug ?? null,
    opensAt: row.opensAt,
    closesAt: row.closesAt,
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
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    steps: row.steps.map((s) => ({
      id: s.id,
      stepKey: s.stepKey,
      label: s.label,
      enabled: s.enabled,
      sortOrder: s.sortOrder,
    })),
    documentRequirements: row.documentRequirements.map((d) => ({
      id: d.id,
      requirementKey: d.requirementKey,
      title: d.title,
      helpText: d.helpText,
      documentType: d.documentType,
      required: d.required,
      acceptedMimeTypes: d.acceptedMimeTypes,
      maxSizeBytes: d.maxSizeBytes,
      sortOrder: d.sortOrder,
    })),
    formPreview,
    registrationCount: row._count.registrations,
  };
}

export type CreateRegistrationFlowInput = {
  organizationId: string;
  title: string;
  slug?: string;
  description?: string;
  productType?: RegistrationProductTypeValue;
};

export async function createRegistrationFlow(
  input: CreateRegistrationFlowInput,
): Promise<{ id: string; slug: string }> {
  const title = input.title.trim();
  if (title.length < 2) {
    throw new Error("TITLE_REQUIRED");
  }

  const explicitSlug = input.slug?.trim();
  let slug: string;

  if (explicitSlug) {
    slug = normalizeRegistrationFlowSlug(explicitSlug);
    if (slug.length < 2) {
      throw new Error("SLUG_INVALID");
    }
    const taken = await prisma.registrationFlow.findFirst({
      where: {
        organizationId: input.organizationId,
        slug,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (taken) {
      throw new Error("SLUG_DUPLICATE");
    }
  } else {
    slug = await uniqueFlowSlug(
      input.organizationId,
      slugFromRegistrationFlowTitle(title),
    );
  }

  try {
    // Use relation-style create (project convention). Nested steps must NOT
    // pass scalar organizationId — Prisma's CreateWithoutFlowInput only
    // accepts organization.connect; tenant is tied via compound FK.
    const flow = await prisma.registrationFlow.create({
      data: {
        organization: { connect: { id: input.organizationId } },
        title,
        slug,
        description: (input.description ?? "").trim(),
        lifecycle: RegistrationFlowLifecycle.DRAFT,
        productType:
          input.productType ?? RegistrationProductType.SCHOOL_REGISTRATION,
        steps: {
          create: DEFAULT_FLOW_STEPS.map((step) => ({
            stepKey: step.stepKey,
            label: step.label,
            enabled: step.enabled,
            sortOrder: step.sortOrder,
            organization: { connect: { id: input.organizationId } },
          })),
        },
      },
      select: { id: true, slug: true },
    });
    return flow;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code === "P2002") {
      throw new Error("SLUG_DUPLICATE");
    }
    throw error;
  }
}

export type UpdateRegistrationFlowGeneralInput = {
  organizationId: string;
  flowId: string;
  title: string;
  slug: string;
  description: string;
  coverMediaId: string | null;
  productType: RegistrationProductTypeValue;
  opensAt: Date | null;
  closesAt: Date | null;
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
  formId: string | null;
};

export async function updateRegistrationFlowGeneral(
  input: UpdateRegistrationFlowGeneralInput,
): Promise<void> {
  const existing = await prisma.registrationFlow.findFirst({
    where: {
      id: input.flowId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!existing) throw new Error("NOT_FOUND");

  const title = input.title.trim();
  if (title.length < 2) throw new Error("TITLE_REQUIRED");

  const slug = await uniqueFlowSlug(
    input.organizationId,
    input.slug.trim() || slugFromRegistrationFlowTitle(title),
    input.flowId,
  );

  if (input.formId) {
    const form = await prisma.form.findFirst({
      where: {
        id: input.formId,
        organizationId: input.organizationId,
        deletedAt: null,
        publishedVersionId: { not: null },
      },
      select: { id: true },
    });
    if (!form) throw new Error("FORM_NOT_FOUND");
  }

  if (input.coverMediaId) {
    const media = await prisma.mediaAsset.findFirst({
      where: {
        id: input.coverMediaId,
        organizationId: input.organizationId,
        deletedAt: null,
        status: MediaAssetStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!media) throw new Error("COVER_NOT_FOUND");
  }

  if (
    input.opensAt &&
    input.closesAt &&
    input.closesAt.getTime() < input.opensAt.getTime()
  ) {
    throw new Error("INVALID_DATES");
  }

  await prisma.registrationFlow.update({
    where: { id: input.flowId },
    data: {
      title,
      slug,
      description: input.description.trim(),
      coverMediaId: input.coverMediaId,
      productType: input.productType,
      opensAt: input.opensAt,
      closesAt: input.closesAt,
      academicYear: input.academicYear,
      gradeTargets: input.gradeTargets,
      courseTarget: input.courseTarget,
      capacity: input.capacity,
      paymentMode: input.paymentMode,
      paymentAmountRials:
        input.paymentMode === RegistrationFlowPaymentMode.FREE
          ? 0
          : Math.max(0, Math.floor(input.paymentAmountRials)),
      paymentTitle:
        input.paymentMode === RegistrationFlowPaymentMode.FREE
          ? null
          : input.paymentTitle,
      paymentDeadlineAt:
        input.paymentMode === RegistrationFlowPaymentMode.FREE ||
        input.paymentMode === RegistrationFlowPaymentMode.VARIABLE_PRICE
          ? null
          : input.paymentDeadlineAt,
      saleAmountRials:
        input.paymentMode === RegistrationFlowPaymentMode.FREE
          ? null
          : input.saleAmountRials,
      pricingBadge:
        input.paymentMode === RegistrationFlowPaymentMode.FREE
          ? null
          : input.pricingBadge,
      discountStartsAt:
        input.paymentMode === RegistrationFlowPaymentMode.FREE
          ? null
          : input.discountStartsAt,
      discountEndsAt:
        input.paymentMode === RegistrationFlowPaymentMode.FREE
          ? null
          : input.discountEndsAt,
      showDiscountCountdown: input.showDiscountCountdown,
      formId: input.formId,
    },
  });
}

export async function updateRegistrationFlowSteps(input: {
  organizationId: string;
  flowId: string;
  steps: Array<{
    id: string;
    enabled: boolean;
    sortOrder: number;
    label: string;
  }>;
}): Promise<void> {
  const existing = await prisma.registrationFlow.findFirst({
    where: {
      id: input.flowId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!existing) throw new Error("NOT_FOUND");

  await prisma.$transaction(
    input.steps.map((step) =>
      prisma.registrationFlowStep.updateMany({
        where: {
          id: step.id,
          flowId: input.flowId,
          organizationId: input.organizationId,
        },
        data: {
          enabled: step.enabled,
          sortOrder: step.sortOrder,
          label: step.label.trim() || undefined,
        },
      }),
    ),
  );
}

export async function upsertRegistrationFlowDocumentRequirement(input: {
  organizationId: string;
  flowId: string;
  requirementId?: string;
  title: string;
  helpText: string;
  documentType: RegistrationDocumentTypeValue;
  required: boolean;
  acceptedMimeTypes: string;
  maxSizeBytes: number;
  requirementKey?: string;
}): Promise<string> {
  const flow = await prisma.registrationFlow.findFirst({
    where: {
      id: input.flowId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!flow) throw new Error("NOT_FOUND");

  const title = input.title.trim();
  if (title.length < 2) throw new Error("TITLE_REQUIRED");

  const maxSizeBytes = Math.min(
    20 * 1024 * 1024,
    Math.max(50 * 1024, Math.floor(input.maxSizeBytes) || DEFAULT_MAX_FILE_BYTES),
  );
  const acceptedMimeTypes =
    input.acceptedMimeTypes.trim() || DEFAULT_ACCEPTED_MIME;

  if (input.requirementId) {
    await prisma.registrationFlowDocumentRequirement.updateMany({
      where: {
        id: input.requirementId,
        flowId: input.flowId,
        organizationId: input.organizationId,
        deletedAt: null,
      },
      data: {
        title,
        helpText: input.helpText.trim(),
        documentType: input.documentType,
        required: input.required,
        acceptedMimeTypes,
        maxSizeBytes,
      },
    });
    return input.requirementId;
  }

  const maxSort = await prisma.registrationFlowDocumentRequirement.aggregate({
    where: {
      flowId: input.flowId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
    _max: { sortOrder: true },
  });

  const requirementKey =
    normalizeRegistrationFlowSlug(
      input.requirementKey?.trim() || title,
    ) || `doc-${Date.now().toString(36)}`;

  const created = await prisma.registrationFlowDocumentRequirement.create({
    data: {
      organizationId: input.organizationId,
      flowId: input.flowId,
      requirementKey,
      title,
      helpText: input.helpText.trim(),
      documentType: input.documentType,
      required: input.required,
      acceptedMimeTypes,
      maxSizeBytes,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
    select: { id: true },
  });

  return created.id;
}

export async function deleteRegistrationFlowDocumentRequirement(input: {
  organizationId: string;
  flowId: string;
  requirementId: string;
}): Promise<void> {
  await prisma.registrationFlowDocumentRequirement.updateMany({
    where: {
      id: input.requirementId,
      flowId: input.flowId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
    data: { deletedAt: new Date() },
  });
}

export async function reorderRegistrationFlowDocumentRequirements(input: {
  organizationId: string;
  flowId: string;
  orderedIds: string[];
}): Promise<void> {
  await prisma.$transaction(
    input.orderedIds.map((id, index) =>
      prisma.registrationFlowDocumentRequirement.updateMany({
        where: {
          id,
          flowId: input.flowId,
          organizationId: input.organizationId,
          deletedAt: null,
        },
        data: { sortOrder: index },
      }),
    ),
  );
}

export async function publishRegistrationFlow(input: {
  organizationId: string;
  flowId: string;
}): Promise<void> {
  const flow = await prisma.registrationFlow.findFirst({
    where: {
      id: input.flowId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
    include: {
      steps: true,
    },
  });
  if (!flow) throw new Error("NOT_FOUND");

  const enabledSteps = flow.steps.filter((s) => s.enabled);
  if (enabledSteps.length === 0) throw new Error("NO_STEPS");

  const formStepEnabled = flow.steps.some(
    (s) => s.stepKey === "FORM" && s.enabled,
  );
  if (formStepEnabled && !flow.formId) {
    throw new Error("FORM_REQUIRED");
  }

  if (
    (flow.paymentMode === RegistrationFlowPaymentMode.FIXED_AMOUNT ||
      flow.paymentMode === RegistrationFlowPaymentMode.FIXED_PRICE ||
      flow.paymentMode === RegistrationFlowPaymentMode.DEPOSIT ||
      flow.paymentMode === RegistrationFlowPaymentMode.INSTALLMENT) &&
    flow.paymentAmountRials <= 0
  ) {
    throw new Error("PAYMENT_AMOUNT_REQUIRED");
  }

  await prisma.registrationFlow.update({
    where: { id: flow.id },
    data: {
      lifecycle: RegistrationFlowLifecycle.ACTIVE,
      publishedAt: flow.publishedAt ?? new Date(),
    },
  });
}

export async function unpublishRegistrationFlow(input: {
  organizationId: string;
  flowId: string;
}): Promise<void> {
  const result = await prisma.registrationFlow.updateMany({
    where: {
      id: input.flowId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
    data: {
      lifecycle: RegistrationFlowLifecycle.DRAFT,
    },
  });
  if (result.count === 0) throw new Error("NOT_FOUND");
}

export async function archiveRegistrationFlow(input: {
  organizationId: string;
  flowId: string;
}): Promise<void> {
  const result = await prisma.registrationFlow.updateMany({
    where: {
      id: input.flowId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
    data: {
      lifecycle: RegistrationFlowLifecycle.ARCHIVED,
    },
  });
  if (result.count === 0) throw new Error("NOT_FOUND");
}

export async function softDeleteRegistrationFlow(input: {
  organizationId: string;
  flowId: string;
}): Promise<void> {
  const result = await prisma.registrationFlow.updateMany({
    where: {
      id: input.flowId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
      lifecycle: RegistrationFlowLifecycle.ARCHIVED,
    },
  });
  if (result.count === 0) throw new Error("NOT_FOUND");
}

export function isRegistrationDocumentType(
  value: string,
): value is RegistrationDocumentTypeValue {
  return Object.values(RegistrationDocumentType).includes(
    value as RegistrationDocumentTypeValue,
  );
}

export function isRegistrationProductType(
  value: string,
): value is RegistrationProductTypeValue {
  return Object.values(RegistrationProductType).includes(
    value as RegistrationProductTypeValue,
  );
}
