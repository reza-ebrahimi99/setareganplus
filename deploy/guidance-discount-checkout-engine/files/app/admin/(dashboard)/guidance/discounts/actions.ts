"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-admin";
import { parsePositiveInt } from "@/lib/guidance/discounts/money";
import {
  createGuidanceDiscountCodes,
  parseScopeFromForm,
  removeGuidanceDiscountCode,
  setGuidanceDiscountActive,
  updateGuidanceDiscountCode,
} from "@/lib/guidance/discounts/store";

function ymdToUtcNoon(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export type DiscountAdminState = {
  error?: string;
  success?: string;
  codes?: string[];
};

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseOptionalDate(ymd: string): Date | null {
  if (!ymd) return null;
  return ymdToUtcNoon(ymd);
}

function readInput(formData: FormData) {
  const type =
    field(formData, "type") === "PERCENTAGE"
      ? ("PERCENTAGE" as const)
      : ("FIXED_AMOUNT" as const);
  const packages = formData
    .getAll("packageScope")
    .filter((item): item is string => typeof item === "string");
  const maxUsesRaw = field(formData, "maxUses");
  const amountRaw = field(formData, "amountToman");
  const percentRaw = field(formData, "percent");
  const amountToman =
    type === "FIXED_AMOUNT" && amountRaw ? parsePositiveInt(amountRaw, "مبلغ تخفیف") : undefined;
  const percent =
    type === "PERCENTAGE" && percentRaw ? parsePositiveInt(percentRaw, "درصد تخفیف") : undefined;
  if (typeof amountToman === "string") throw new Error(amountToman);
  if (typeof percent === "string") throw new Error(percent);
  const maxUses = maxUsesRaw ? parsePositiveInt(maxUsesRaw, "حداکثر تعداد استفاده") : null;
  if (typeof maxUses === "string") throw new Error(maxUses);
  return {
    code: field(formData, "code"),
    type,
    amountToman,
    percent,
    scope: parseScopeFromForm(packages),
    startsAt: parseOptionalDate(field(formData, "startsAt")),
    endsAt: parseOptionalDate(field(formData, "endsAt")),
    maxUses,
    note: field(formData, "note") || null,
    isActive: field(formData, "isActive") !== "0",
  };
}

export async function createGuidanceDiscountAction(
  _prev: DiscountAdminState,
  formData: FormData,
): Promise<DiscountAdminState> {
  const session = await requirePermission("settings.manage");
  const quantityRaw = field(formData, "quantity") || "1";
  const quantity = parsePositiveInt(quantityRaw, "تعداد");
  if (typeof quantity === "string") return { error: quantity };
  try {
    const result = await createGuidanceDiscountCodes({
      organizationId: session.organization.id,
      input: readInput(formData),
      quantity: Math.min(100, quantity),
    });
    revalidatePath("/admin/guidance/discounts");
    return {
      success:
        result.codes.length > 1
          ? `${result.codes.length} کد تخفیف ساخته شد.`
          : "کد تخفیف ثبت شد.",
      codes: result.codes,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "ثبت کد انجام نشد." };
  }
}

export async function updateGuidanceDiscountAction(
  _prev: DiscountAdminState,
  formData: FormData,
): Promise<DiscountAdminState> {
  const session = await requirePermission("settings.manage");
  const id = field(formData, "id");
  if (!id) return { error: "کد مشخص نیست." };
  try {
    await updateGuidanceDiscountCode({
      organizationId: session.organization.id,
      id,
      input: readInput(formData),
    });
    revalidatePath("/admin/guidance/discounts");
    return { success: "کد تخفیف به‌روز شد." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "ویرایش انجام نشد." };
  }
}

export async function toggleGuidanceDiscountAction(
  _prev: DiscountAdminState,
  formData: FormData,
): Promise<DiscountAdminState> {
  const session = await requirePermission("settings.manage");
  const id = field(formData, "id");
  const isActive = field(formData, "isActive") === "1";
  if (!id) return { error: "کد مشخص نیست." };
  try {
    await setGuidanceDiscountActive({
      organizationId: session.organization.id,
      id,
      isActive,
    });
    revalidatePath("/admin/guidance/discounts");
    return { success: isActive ? "کد فعال شد." : "کد غیرفعال شد." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تغییر وضعیت انجام نشد." };
  }
}

export async function deleteGuidanceDiscountAction(
  _prev: DiscountAdminState,
  formData: FormData,
): Promise<DiscountAdminState> {
  const session = await requirePermission("settings.manage");
  const id = field(formData, "id");
  if (!id) return { error: "کد مشخص نیست." };
  try {
    await removeGuidanceDiscountCode({
      organizationId: session.organization.id,
      id,
    });
    revalidatePath("/admin/guidance/discounts");
    return { success: "کد حذف یا بایگانی شد." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "حذف انجام نشد." };
  }
}
