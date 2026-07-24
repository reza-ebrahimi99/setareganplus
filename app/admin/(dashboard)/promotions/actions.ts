"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  PromotionType,
  PromotionValueType,
} from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/require-admin";
import { parseTehranDateTimeLocal } from "@/lib/forms/tehran-datetime";
import {
  createPromotion,
  duplicatePromotion,
  setPromotionActive,
  softDeletePromotion,
  updatePromotion,
  type PromotionWriteInput,
} from "@/lib/promotions/admin";

export type PromotionActionState = {
  formError?: string;
  successMessage?: string;
  fieldErrors?: Record<string, string>;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseOptionalInt(
  raw: string,
  field: string,
  errors: Record<string, string>,
): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n)) {
    errors[field] = "عدد صحیح وارد کنید.";
    return null;
  }
  return n;
}

function parseWriteInput(
  formData: FormData,
):
  | { ok: true; data: PromotionWriteInput }
  | { ok: false; formError: string; fieldErrors?: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  const title = readString(formData, "title").trim();
  const codeRaw = readString(formData, "code").trim();
  const typeRaw = readString(formData, "type");
  const valueTypeRaw = readString(formData, "valueType");
  const value = parseOptionalInt(
    readString(formData, "value"),
    "value",
    fieldErrors,
  );
  const maxDiscountAmount = parseOptionalInt(
    readString(formData, "maxDiscountAmount"),
    "maxDiscountAmount",
    fieldErrors,
  );
  const priority =
    parseOptionalInt(readString(formData, "priority"), "priority", fieldErrors) ??
    100;
  const usageLimit = parseOptionalInt(
    readString(formData, "usageLimit"),
    "usageLimit",
    fieldErrors,
  );
  const usagePerNationalCode = parseOptionalInt(
    readString(formData, "usagePerNationalCode"),
    "usagePerNationalCode",
    fieldErrors,
  );

  if (!Object.values(PromotionType).includes(typeRaw as PromotionType)) {
    fieldErrors.type = "نوع تخفیف نامعتبر است.";
  }
  if (
    !Object.values(PromotionValueType).includes(
      valueTypeRaw as PromotionValueType,
    )
  ) {
    fieldErrors.valueType = "نوع مقدار نامعتبر است.";
  }

  let startsAt: Date | null = null;
  let endsAt: Date | null = null;
  const startsRaw = readString(formData, "startsAt").trim();
  const endsRaw = readString(formData, "endsAt").trim();
  if (startsRaw) {
    startsAt = parseTehranDateTimeLocal(startsRaw);
    if (!startsAt) fieldErrors.startsAt = "تاریخ شروع نامعتبر است.";
  }
  if (endsRaw) {
    endsAt = parseTehranDateTimeLocal(endsRaw);
    if (!endsAt) fieldErrors.endsAt = "تاریخ پایان نامعتبر است.";
  }

  if (Object.keys(fieldErrors).length > 0 || value == null) {
    if (value == null && !fieldErrors.value) {
      fieldErrors.value = "مقدار تخفیف الزامی است.";
    }
    return {
      ok: false,
      formError: "لطفاً خطاهای فرم را برطرف کنید.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: {
      title,
      code: codeRaw || null,
      type: typeRaw as PromotionType,
      valueType: valueTypeRaw as PromotionValueType,
      value,
      maxDiscountAmount,
      stackable: readString(formData, "stackable") === "true",
      priority,
      startsAt,
      endsAt,
      usageLimit,
      usagePerNationalCode,
      isActive: readString(formData, "isActive") !== "false",
      registrationFlowId: readString(formData, "registrationFlowId").trim() || null,
      ownerStaffId: readString(formData, "ownerStaffId").trim() || null,
    },
  };
}

function revalidatePromotions(id?: string) {
  revalidatePath("/admin/promotions");
  revalidatePath("/admin/reports/promotions");
  if (id) revalidatePath(`/admin/promotions/${id}`);
}

export async function createPromotionAction(
  _prev: PromotionActionState,
  formData: FormData,
): Promise<PromotionActionState> {
  const session = await requirePermission("promotions.manage");
  const parsed = parseWriteInput(formData);
  if (!parsed.ok) {
    return {
      formError: parsed.formError,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const result = await createPromotion(session.organization.id, parsed.data);
  if (!result.ok) {
    return {
      formError: "fieldErrors" in result ? "خطا در ذخیره." : "خطا در ذخیره.",
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }

  revalidatePromotions(result.id);
  redirect(`/admin/promotions/${result.id}`);
}

export async function updatePromotionAction(
  _prev: PromotionActionState,
  formData: FormData,
): Promise<PromotionActionState> {
  const session = await requirePermission("promotions.manage");
  const id = readString(formData, "id").trim();
  if (!id) return { formError: "شناسه نامعتبر است." };

  const parsed = parseWriteInput(formData);
  if (!parsed.ok) {
    return {
      formError: parsed.formError,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const result = await updatePromotion(
    session.organization.id,
    id,
    parsed.data,
  );
  if (!result.ok) {
    return {
      formError:
        "formError" in result && result.formError
          ? result.formError
          : "خطا در ذخیره.",
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }

  revalidatePromotions(id);
  return { successMessage: "تغییرات ذخیره شد." };
}

export async function togglePromotionActiveAction(formData: FormData) {
  const session = await requirePermission("promotions.manage");
  const id = readString(formData, "id").trim();
  const isActive = readString(formData, "isActive") === "true";
  if (!id) return;
  await setPromotionActive(session.organization.id, id, isActive);
  revalidatePromotions(id);
}

export async function deletePromotionAction(formData: FormData) {
  const session = await requirePermission("promotions.manage");
  const id = readString(formData, "id").trim();
  if (!id) return;
  await softDeletePromotion(session.organization.id, id);
  revalidatePromotions();
  redirect("/admin/promotions");
}

export async function duplicatePromotionAction(formData: FormData) {
  const session = await requirePermission("promotions.manage");
  const id = readString(formData, "id").trim();
  if (!id) return;
  const result = await duplicatePromotion(session.organization.id, id);
  if (!result.ok) return;
  revalidatePromotions(result.id);
  redirect(`/admin/promotions/${result.id}`);
}
