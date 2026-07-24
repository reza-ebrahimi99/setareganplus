"use server";

import {
  RegistrationDocumentReviewStatus,
  RegistrationFlowLifecycle,
  RegistrationFlowPaymentMode,
  RegistrationStatus,
} from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/require-admin";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { parseTehranDateTimeLocal } from "@/lib/forms/tehran-datetime";
import { syncTimedPromotionFromRegistrationFlow } from "@/lib/promotions/sync-timed";
import { prisma } from "@/lib/prisma";
import {
  addRegistrationNote,
  markRegistrationNeedsCall,
  updateRegistrationStatus,
} from "@/lib/registration/admin-ops";
import { listRegistrationCatalogs } from "@/lib/registration/catalog-registry";
import { reviewRegistrationDocument } from "@/lib/registration/documents";
import { ensureRegistrationFlowConfig } from "@/lib/registration/flow-config-db";
import { normalizeRegistrationFlowSlug } from "@/lib/registration/flows/slug";
import { revalidatePath } from "next/cache";

export async function changeRegistrationStatusAction(formData: FormData) {
  const session = await requirePermission("registrations.manage");
  const id = String(formData.get("registrationId") ?? "");
  const status = String(formData.get("status") ?? "") as RegistrationStatus;
  const reason = String(formData.get("reason") ?? "");
  if (!id || !Object.values(RegistrationStatus).includes(status)) {
    return;
  }
  await updateRegistrationStatus({
    organizationId: session.organization.id,
    registrationId: id,
    status,
    actorUserId: session.user.id,
    reason: reason || null,
  });
  revalidatePath("/admin/registrations");
  revalidatePath(`/admin/registrations/${id}`);
}

export async function addRegistrationNoteAction(formData: FormData) {
  const session = await requirePermission("registrations.manage");
  const id = String(formData.get("registrationId") ?? "");
  const body = String(formData.get("body") ?? "");
  await addRegistrationNote({
    organizationId: session.organization.id,
    registrationId: id,
    body,
    actorUserId: session.user.id,
  });
  revalidatePath(`/admin/registrations/${id}`);
}

export async function markNeedsCallAction(formData: FormData) {
  const session = await requirePermission("registrations.manage");
  const id = String(formData.get("registrationId") ?? "");
  await markRegistrationNeedsCall({
    organizationId: session.organization.id,
    registrationId: id,
    actorUserId: session.user.id,
  });
  revalidatePath("/admin/registrations");
  revalidatePath(`/admin/registrations/${id}`);
}

export async function reviewDocumentAction(formData: FormData) {
  const session = await requirePermission("registrations.manage");
  const documentId = String(formData.get("documentId") ?? "");
  const registrationId = String(formData.get("registrationId") ?? "");
  const reviewStatus = String(
    formData.get("reviewStatus") ?? "",
  ) as RegistrationDocumentReviewStatus;
  const reviewNote = String(formData.get("reviewNote") ?? "");
  if (
    !documentId ||
    !Object.values(RegistrationDocumentReviewStatus).includes(reviewStatus)
  ) {
    return;
  }
  await reviewRegistrationDocument({
    organizationId: session.organization.id,
    documentId,
    actorUserId: session.user.id,
    reviewStatus,
    reviewNote: reviewNote || null,
  });
  revalidatePath(`/admin/registrations/${registrationId}`);
}

/** Commercial / SMS / window settings for coded catalog flows (Phase A UX). */
export type RegistrationFlowActionState = {
  formError?: string;
  successMessage?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

function readOptionalInt(
  formData: FormData,
  key: string,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return { ok: true, value: null };
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    return { ok: false, error: "مقدار عددی نامعتبر است." };
  }
  return { ok: true, value };
}

function readOptionalDateTime(
  formData: FormData,
  key: string,
): { ok: true; value: Date | null } | { ok: false; error: string } {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return { ok: true, value: null };
  const parsed = parseTehranDateTimeLocal(raw);
  if (!parsed) {
    return { ok: false, error: "تاریخ/ساعت نامعتبر است." };
  }
  return { ok: true, value: parsed };
}

export async function updateRegistrationFlowAction(
  _prev: RegistrationFlowActionState,
  formData: FormData,
): Promise<RegistrationFlowActionState> {
  const session = await requirePermission("registration_flows.manage");
  const flowKey = String(formData.get("flowKey") ?? "").trim();
  const catalog = listRegistrationCatalogs().find(
    (item) => item.flowKey === flowKey,
  );
  if (!catalog) {
    return { formError: "جریان ثبت‌نام یافت نشد." };
  }

  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }

  const fieldErrors: Record<string, string> = {};

  const baseAmount = readOptionalInt(formData, "baseAmountRials");
  if (!baseAmount.ok) fieldErrors.baseAmountRials = baseAmount.error;
  const saleAmount = readOptionalInt(formData, "saleAmountRials");
  if (!saleAmount.ok) fieldErrors.saleAmountRials = saleAmount.error;
  const capacity = readOptionalInt(formData, "capacity");
  if (!capacity.ok) fieldErrors.capacity = capacity.error;

  const discountStartsAt = readOptionalDateTime(formData, "discountStartsAt");
  if (!discountStartsAt.ok) fieldErrors.discountStartsAt = discountStartsAt.error;
  const discountEndsAt = readOptionalDateTime(formData, "discountEndsAt");
  if (!discountEndsAt.ok) fieldErrors.discountEndsAt = discountEndsAt.error;
  const registrationStartsAt = readOptionalDateTime(
    formData,
    "registrationStartsAt",
  );
  if (!registrationStartsAt.ok) {
    fieldErrors.registrationStartsAt = registrationStartsAt.error;
  }
  const registrationEndsAt = readOptionalDateTime(
    formData,
    "registrationEndsAt",
  );
  if (!registrationEndsAt.ok) {
    fieldErrors.registrationEndsAt = registrationEndsAt.error;
  }

  if (
    baseAmount.ok &&
    saleAmount.ok &&
    baseAmount.value != null &&
    saleAmount.value != null &&
    saleAmount.value > baseAmount.value
  ) {
    fieldErrors.saleAmountRials =
      "قیمت فروش نباید از قیمت اصلی بیشتر باشد.";
  }

  const recipientsRaw = String(formData.get("adminSmsRecipients") ?? "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const adminSmsRecipients: string[] = [];
  for (const recipient of recipientsRaw) {
    const normalized = normalizeIranianMobile(recipient);
    if (!normalized.ok) {
      fieldErrors.adminSmsRecipients =
        "یکی از شماره‌های مدیر نامعتبر است.";
      break;
    }
    adminSmsRecipients.push(normalized.normalized);
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values, formError: "لطفاً خطاهای فرم را برطرف کنید." };
  }

  await ensureRegistrationFlowConfig({
    organizationId: session.organization.id,
    flowKey,
  });

  const slug = normalizeRegistrationFlowSlug(flowKey);
  const isFree = formData.get("isFree") === "on";
  const isActive = formData.get("isActive") === "on";
  const title =
    String(formData.get("title") ?? catalog.title).trim() || catalog.title;
  const description =
    String(formData.get("subtitle") ?? "").trim() || catalog.subtitle || "";

  const updated = await prisma.registrationFlow.update({
    where: {
      organizationId_slug: {
        organizationId: session.organization.id,
        slug,
      },
    },
    data: {
      title,
      description,
      lifecycle: isActive
        ? RegistrationFlowLifecycle.ACTIVE
        : RegistrationFlowLifecycle.DRAFT,
      paymentMode: isFree
        ? RegistrationFlowPaymentMode.FREE
        : RegistrationFlowPaymentMode.FIXED_PRICE,
      paymentAmountRials: baseAmount.ok ? (baseAmount.value ?? 0) : 0,
      saleAmountRials: saleAmount.ok ? saleAmount.value : null,
      pricingBadge: String(formData.get("pricingBadge") ?? "").trim() || null,
      discountStartsAt: discountStartsAt.ok ? discountStartsAt.value : null,
      discountEndsAt: discountEndsAt.ok ? discountEndsAt.value : null,
      showDiscountCountdown: formData.get("showDiscountCountdown") === "on",
      opensAt: registrationStartsAt.ok ? registrationStartsAt.value : null,
      closesAt: registrationEndsAt.ok ? registrationEndsAt.value : null,
      capacity: capacity.ok ? capacity.value : null,
      showRemainingCapacity: formData.get("showRemainingCapacity") === "on",
      confirmationSmsEnabled: formData.get("confirmationSmsEnabled") === "on",
      adminNotificationSmsEnabled:
        formData.get("adminNotificationSmsEnabled") === "on",
      smsTemplateCode:
        String(formData.get("smsTemplateCode") ?? "").trim() || null,
      adminSmsRecipients,
    },
    select: { id: true },
  });

  await syncTimedPromotionFromRegistrationFlow({
    organizationId: session.organization.id,
    registrationFlowId: updated.id,
    title,
    paymentAmountRials: baseAmount.ok ? (baseAmount.value ?? 0) : 0,
    saleAmountRials: saleAmount.ok ? saleAmount.value : null,
    pricingBadge: String(formData.get("pricingBadge") ?? "").trim() || null,
    discountStartsAt: discountStartsAt.ok ? discountStartsAt.value : null,
    discountEndsAt: discountEndsAt.ok ? discountEndsAt.value : null,
    isFree,
  });

  revalidatePath("/admin/registrations");
  revalidatePath("/admin/registrations/flows");
  revalidatePath("/admin/promotions");
  revalidatePath(
    `/admin/registrations/flows/catalog/${encodeURIComponent(flowKey)}`,
  );
  revalidatePath("/ghalamchi/register/wizard");

  return {
    successMessage: "تنظیمات جریان ثبت‌نام ذخیره شد.",
    values,
  };
}
