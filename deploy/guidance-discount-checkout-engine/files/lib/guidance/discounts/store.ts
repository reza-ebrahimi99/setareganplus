import { prisma } from "@/lib/prisma";
import { generateUniqueGuidanceDiscountCodes } from "@/lib/guidance/discounts/generate";
import { normalizeGuidanceDiscountCode } from "@/lib/guidance/discounts/engine";
import { tomanToRials } from "@/lib/guidance/discounts/money";
import {
  parsePackageScope,
  serializePackageScope,
  type GuidanceDiscountScope,
} from "@/lib/guidance/discounts/packages";

export type GuidanceDiscountType = "FIXED_AMOUNT" | "PERCENTAGE";

export type GuidanceDiscountInput = {
  code?: string;
  type: GuidanceDiscountType;
  amountToman?: number;
  percent?: number;
  scope: GuidanceDiscountScope;
  startsAt?: Date | null;
  endsAt?: Date | null;
  maxUses?: number | null;
  note?: string | null;
  isActive?: boolean;
};

function normalizeCode(raw: string): string {
  return normalizeGuidanceDiscountCode(raw);
}

function validateInput(input: GuidanceDiscountInput): string | null {
  if (input.type === "PERCENTAGE") {
    const percent = input.percent ?? 0;
    if (!Number.isInteger(percent) || percent <= 0 || percent > 100) {
      return "درصد تخفیف باید بین ۱ تا ۱۰۰ باشد.";
    }
  } else {
    const toman = input.amountToman ?? 0;
    if (!Number.isInteger(toman) || toman <= 0) {
      return "مبلغ تخفیف باید عدد صحیح مثبت به تومان باشد.";
    }
  }
  if (input.startsAt && input.endsAt && input.startsAt.getTime() > input.endsAt.getTime()) {
    return "تاریخ پایان باید بعد از تاریخ شروع باشد.";
  }
  if (input.maxUses != null && (!Number.isInteger(input.maxUses) || input.maxUses <= 0)) {
    return "حداکثر تعداد استفاده باید عدد صحیح مثبت باشد.";
  }
  return null;
}

function valueFromInput(input: GuidanceDiscountInput): number {
  if (input.type === "PERCENTAGE") return input.percent ?? 0;
  return tomanToRials(input.amountToman ?? 0);
}

export async function listGuidanceDiscountCodes(params: {
  organizationId: string;
  query?: string;
  status?: "all" | "active" | "inactive";
}) {
  const query = params.query?.trim();
  return prisma.guidanceDiscountCode.findMany({
    where: {
      organizationId: params.organizationId,
      archivedAt: null,
      ...(params.status === "active" ? { isActive: true } : {}),
      ...(params.status === "inactive" ? { isActive: false } : {}),
      ...(query
        ? {
            OR: [
              { code: { contains: query.toUpperCase(), mode: "insensitive" } },
              { note: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    take: 400,
  });
}

export async function createGuidanceDiscountCodes(params: {
  organizationId: string;
  input: GuidanceDiscountInput;
  quantity?: number;
}): Promise<{ codes: string[] }> {
  const error = validateInput(params.input);
  if (error) throw new Error(error);

  const quantity = Math.min(100, Math.max(1, Math.floor(params.quantity ?? 1)));
  const existing = await prisma.guidanceDiscountCode.findMany({
    where: { organizationId: params.organizationId },
    select: { code: true },
  });
  const existingSet = new Set<string>(existing.map((row) => normalizeCode(row.code)));

  let codes: string[];
  const custom = params.input.code ? normalizeCode(params.input.code) : "";
  if (quantity === 1 && custom) {
    if (!/^[A-Z0-9_-]{3,40}$/.test(custom)) {
      throw new Error("کد تخفیف باید ۳ تا ۴۰ نویسه انگلیسی/عدد باشد.");
    }
    if (existingSet.has(custom)) {
      throw new Error("این کد قبلاً ثبت شده است.");
    }
    codes = [custom];
  } else {
    codes = generateUniqueGuidanceDiscountCodes({
      count: quantity,
      prefix: custom && quantity > 1 ? custom.replace(/[^A-Z0-9]/g, "").slice(0, 6) : "",
      existing: existingSet,
    });
  }

  const value = valueFromInput(params.input);
  await prisma.$transaction(async (tx) => {
    await tx.guidanceDiscountCode.createMany({
      data: codes.map((code) => ({
        organizationId: params.organizationId,
        code,
        type: params.input.type,
        value,
        packageScope: serializePackageScope(params.input.scope),
        startsAt: params.input.startsAt ?? null,
        endsAt: params.input.endsAt ?? null,
        maxUses: params.input.maxUses ?? null,
        note: params.input.note?.trim() || null,
        isActive: params.input.isActive !== false,
      })),
    });
  });
  return { codes };
}

export async function updateGuidanceDiscountCode(params: {
  organizationId: string;
  id: string;
  input: GuidanceDiscountInput;
}) {
  const error = validateInput(params.input);
  if (error) throw new Error(error);
  const current = await prisma.guidanceDiscountCode.findFirst({
    where: { id: params.id, organizationId: params.organizationId },
  });
  if (!current) throw new Error("کد تخفیف یافت نشد.");

  const nextCode = params.input.code ? normalizeCode(params.input.code) : current.code;
  if (nextCode !== current.code) {
    if (!/^[A-Z0-9_-]{3,40}$/.test(nextCode)) {
      throw new Error("کد تخفیف باید ۳ تا ۴۰ نویسه انگلیسی/عدد باشد.");
    }
    const clash = await prisma.guidanceDiscountCode.findFirst({
      where: {
        organizationId: params.organizationId,
        code: nextCode,
        NOT: { id: current.id },
      },
      select: { id: true },
    });
    if (clash) throw new Error("این کد قبلاً ثبت شده است.");
  }

  return prisma.guidanceDiscountCode.update({
    where: { id: current.id },
    data: {
      code: nextCode,
      type: params.input.type,
      value: valueFromInput(params.input),
      packageScope: serializePackageScope(params.input.scope),
      startsAt: params.input.startsAt ?? null,
      endsAt: params.input.endsAt ?? null,
      maxUses: params.input.maxUses ?? null,
      note: params.input.note?.trim() || null,
      isActive: params.input.isActive !== false,
    },
  });
}

export async function setGuidanceDiscountActive(params: {
  organizationId: string;
  id: string;
  isActive: boolean;
}) {
  const current = await prisma.guidanceDiscountCode.findFirst({
    where: { id: params.id, organizationId: params.organizationId },
  });
  if (!current) throw new Error("کد تخفیف یافت نشد.");
  return prisma.guidanceDiscountCode.update({
    where: { id: current.id },
    data: {
      isActive: params.isActive,
      archivedAt: params.isActive ? null : current.archivedAt,
    },
  });
}

export async function removeGuidanceDiscountCode(params: {
  organizationId: string;
  id: string;
}) {
  const current = await prisma.guidanceDiscountCode.findFirst({
    where: { id: params.id, organizationId: params.organizationId },
  });
  if (!current) throw new Error("کد تخفیف یافت نشد.");
  if (current.usageCount > 0) {
    return prisma.guidanceDiscountCode.update({
      where: { id: current.id },
      data: { isActive: false, archivedAt: new Date() },
    });
  }
  await prisma.guidanceDiscountCode.delete({ where: { id: current.id } });
  return { deleted: true };
}

export function parseScopeFromForm(values: string[]): GuidanceDiscountScope {
  if (values.includes("ALL") || values.length === 0) return "ALL";
  return parsePackageScope(values.join(","));
}
