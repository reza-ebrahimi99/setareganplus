/**
 * Admin CRUD + list/filter for Promotion Engine.
 */

import { MembershipStatus } from "@/generated/prisma/enums";
import {
  PromotionType,
  PromotionValueType,
  type PromotionType as PromotionTypeValue,
  type PromotionValueType as PromotionValueTypeValue,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type PromotionListFilters = {
  q?: string;
  type?: PromotionTypeValue | "";
  isActive?: "true" | "false" | "";
  flowId?: string;
  page?: number;
  pageSize?: number;
  sort?: "priority" | "usage" | "updated" | "title";
};

export type PromotionListResult = {
  items: PromotionListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PromotionListItem = {
  id: string;
  title: string;
  code: string | null;
  type: PromotionTypeValue;
  valueType: PromotionValueTypeValue;
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
  flowTitle: string | null;
  ownerStaffId: string | null;
  ownerStaffName: string | null;
  totalDiscountRials: number;
};

export type PromotionWriteInput = {
  title: string;
  code: string | null;
  type: PromotionTypeValue;
  valueType: PromotionValueTypeValue;
  value: number;
  maxDiscountAmount: number | null;
  stackable: boolean;
  priority: number;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usagePerNationalCode: number | null;
  isActive: boolean;
  registrationFlowId: string | null;
  ownerStaffId: string | null;
};

export function validatePromotionWriteInput(
  input: PromotionWriteInput,
): { ok: true } | { ok: false; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  if (!input.title.trim()) fieldErrors.title = "عنوان الزامی است.";

  if (input.type === PromotionType.TIMED) {
    // TIMED may have null code (flow sale).
  } else if (
    input.type === PromotionType.COUPON ||
    input.type === PromotionType.REFERRAL
  ) {
    if (!input.code?.trim()) {
      fieldErrors.code = "کد برای این نوع الزامی است.";
    }
  }

  if (input.type === PromotionType.REFERRAL && !input.ownerStaffId) {
    fieldErrors.ownerStaffId = "معرف (کارشناس) را انتخاب کنید.";
  }

  if (!Number.isInteger(input.value) || input.value <= 0) {
    fieldErrors.value = "مقدار تخفیف باید عدد مثبت باشد.";
  } else if (input.valueType === PromotionValueType.PERCENT && input.value > 100) {
    fieldErrors.value = "درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد.";
  }

  if (
    input.maxDiscountAmount != null &&
    (!Number.isInteger(input.maxDiscountAmount) || input.maxDiscountAmount < 0)
  ) {
    fieldErrors.maxDiscountAmount = "سقف تخفیف نامعتبر است.";
  }

  if (
    input.startsAt &&
    input.endsAt &&
    input.endsAt.getTime() <= input.startsAt.getTime()
  ) {
    fieldErrors.endsAt = "تاریخ پایان باید بعد از شروع باشد.";
  }

  if (
    input.usageLimit != null &&
    (!Number.isInteger(input.usageLimit) || input.usageLimit < 1)
  ) {
    fieldErrors.usageLimit = "سقف استفاده نامعتبر است.";
  }

  if (
    input.usagePerNationalCode != null &&
    (!Number.isInteger(input.usagePerNationalCode) ||
      input.usagePerNationalCode < 1)
  ) {
    fieldErrors.usagePerNationalCode = "سقف هر کد ملی نامعتبر است.";
  }

  return Object.keys(fieldErrors).length > 0
    ? { ok: false, fieldErrors }
    : { ok: true };
}

export async function listPromotions(
  organizationId: string,
  filters: PromotionListFilters = {},
): Promise<PromotionListResult> {
  const where: Prisma.PromotionWhereInput = {
    organizationId,
    deletedAt: null,
  };

  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filters.type) where.type = filters.type;
  if (filters.isActive === "true") where.isActive = true;
  if (filters.isActive === "false") where.isActive = false;
  if (filters.flowId) where.registrationFlowId = filters.flowId;

  const pageSize = Math.min(50, Math.max(5, filters.pageSize ?? 20));
  const page = Math.max(1, filters.page ?? 1);
  const skip = (page - 1) * pageSize;

  const orderBy: Prisma.PromotionOrderByWithRelationInput[] =
    filters.sort === "usage"
      ? [{ usageCount: "desc" }, { updatedAt: "desc" }]
      : filters.sort === "title"
        ? [{ title: "asc" }]
        : filters.sort === "updated"
          ? [{ updatedAt: "desc" }]
          : [{ priority: "asc" }, { updatedAt: "desc" }];

  const [total, rows] = await Promise.all([
    prisma.promotion.count({ where }),
    prisma.promotion.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: {
        registrationFlow: { select: { title: true } },
        ownerStaff: { select: { firstName: true, lastName: true } },
        usages: { select: { discountAmount: true } },
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    items: rows.map((row) => ({
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
      flowTitle: row.registrationFlow?.title ?? null,
      ownerStaffId: row.ownerStaffId,
      ownerStaffName: row.ownerStaff
        ? `${row.ownerStaff.firstName} ${row.ownerStaff.lastName}`.trim()
        : null,
      totalDiscountRials: row.usages.reduce(
        (sum, u) => sum + u.discountAmount,
        0,
      ),
    })),
  };
}

export async function getPromotionDetail(
  organizationId: string,
  id: string,
) {
  return prisma.promotion.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: {
      registrationFlow: { select: { id: true, title: true, slug: true } },
      ownerStaff: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

export async function createPromotion(
  organizationId: string,
  input: PromotionWriteInput,
) {
  const validated = validatePromotionWriteInput(input);
  if (!validated.ok) return validated;

  const code = input.code?.trim().toUpperCase() || null;
  if (code) {
    const clash = await prisma.promotion.findFirst({
      where: { organizationId, code, deletedAt: null },
      select: { id: true },
    });
    if (clash) {
      return {
        ok: false as const,
        fieldErrors: { code: "این کد قبلاً ثبت شده است." },
      };
    }
  }

  const created = await prisma.promotion.create({
    data: {
      organizationId,
      title: input.title.trim(),
      code,
      type: input.type,
      valueType: input.valueType,
      value: input.value,
      maxDiscountAmount: input.maxDiscountAmount,
      stackable: input.stackable,
      priority: input.priority,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      usageLimit: input.usageLimit,
      usagePerNationalCode: input.usagePerNationalCode,
      isActive: input.isActive,
      registrationFlowId: input.registrationFlowId,
      ownerStaffId: input.ownerStaffId,
    },
    select: { id: true },
  });

  return { ok: true as const, id: created.id };
}

export async function updatePromotion(
  organizationId: string,
  id: string,
  input: PromotionWriteInput,
) {
  const existing = await prisma.promotion.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false as const, formError: "تخفیف یافت نشد." };
  }

  const validated = validatePromotionWriteInput(input);
  if (!validated.ok) return validated;

  const code = input.code?.trim().toUpperCase() || null;
  if (code) {
    const clash = await prisma.promotion.findFirst({
      where: {
        organizationId,
        code,
        deletedAt: null,
        NOT: { id },
      },
      select: { id: true },
    });
    if (clash) {
      return {
        ok: false as const,
        fieldErrors: { code: "این کد قبلاً ثبت شده است." },
      };
    }
  }

  await prisma.promotion.update({
    where: { id },
    data: {
      title: input.title.trim(),
      code,
      type: input.type,
      valueType: input.valueType,
      value: input.value,
      maxDiscountAmount: input.maxDiscountAmount,
      stackable: input.stackable,
      priority: input.priority,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      usageLimit: input.usageLimit,
      usagePerNationalCode: input.usagePerNationalCode,
      isActive: input.isActive,
      registrationFlowId: input.registrationFlowId,
      ownerStaffId: input.ownerStaffId,
    },
  });

  return { ok: true as const };
}

export async function setPromotionActive(
  organizationId: string,
  id: string,
  isActive: boolean,
) {
  const existing = await prisma.promotion.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { ok: false as const, error: "تخفیف یافت نشد." };
  await prisma.promotion.update({
    where: { id },
    data: { isActive },
  });
  return { ok: true as const };
}

export async function softDeletePromotion(
  organizationId: string,
  id: string,
) {
  const existing = await prisma.promotion.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { ok: false as const, error: "تخفیف یافت نشد." };
  await prisma.promotion.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date(), code: null },
  });
  return { ok: true as const };
}

export async function duplicatePromotion(
  organizationId: string,
  id: string,
) {
  const existing = await prisma.promotion.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!existing) return { ok: false as const, error: "تخفیف یافت نشد." };

  let code: string | null = null;
  if (existing.code) {
    code = `${existing.code}-COPY`;
    const clash = await prisma.promotion.findFirst({
      where: { organizationId, code, deletedAt: null },
      select: { id: true },
    });
    if (clash) {
      code = `${existing.code}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
    }
  }

  const created = await prisma.promotion.create({
    data: {
      organizationId,
      title: `${existing.title} (کپی)`,
      code,
      type: existing.type,
      valueType: existing.valueType,
      value: existing.value,
      maxDiscountAmount: existing.maxDiscountAmount,
      stackable: existing.stackable,
      priority: existing.priority,
      startsAt: existing.startsAt,
      endsAt: existing.endsAt,
      usageLimit: existing.usageLimit,
      usageCount: 0,
      usagePerNationalCode: existing.usagePerNationalCode,
      isActive: false,
      registrationFlowId: existing.registrationFlowId,
      ownerStaffId: existing.ownerStaffId,
      metadata: existing.metadata ?? undefined,
    },
    select: { id: true },
  });

  return { ok: true as const, id: created.id };
}

export async function listStaffOptions(organizationId: string) {
  const memberships = await prisma.organizationMembership.findMany({
    where: {
      organizationId,
      deletedAt: null,
      status: MembershipStatus.ACTIVE,
      user: { deletedAt: null },
    },
    select: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({
    id: m.user.id,
    name: `${m.user.firstName} ${m.user.lastName}`.trim(),
  }));
}

export async function listFlowOptions(organizationId: string) {
  const flows = await prisma.registrationFlow.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, title: true, slug: true },
    orderBy: { title: "asc" },
  });
  return flows;
}
