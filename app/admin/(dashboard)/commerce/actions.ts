"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { upsertCommerceItemFromForm } from "@/lib/commerce/catalog/service";
import {
  addCommerceOrderNote,
  advanceCommerceOrderStage,
  rollbackCommerceOrderStage,
  updateCommerceOrderDetails,
} from "@/lib/commerce/orders/ops";
import {
  bulkAdvanceCommerceOrders,
  bulkAssignCommerceOrders,
} from "@/lib/commerce/orders/bulk";
import { markCommerceOpsNotificationsRead } from "@/lib/commerce/orders/notify";
import {
  previewBookletSms,
  resendBookletSms,
  retryBookletSms,
  sendTestBookletSms,
} from "@/lib/commerce/booklet-sms/service";
import { isCommerceOpsStage } from "@/lib/commerce/orders/ops-stage";
import { createSingleItemCommerceOrder } from "@/lib/commerce/orders/service";
import {
  requirePermission,
  type AdminSessionContext,
} from "@/lib/auth/require-admin";

export type CommerceProductActionState = {
  formError?: string;
  successMessage?: string;
};

export type CommerceOrderActionState = {
  formError?: string;
  successMessage?: string;
};

export type CommerceSmsPreviewActionState = {
  formError?: string;
  successMessage?: string;
  previewBody?: string;
  previewStage?: string;
  /** Present only when this stage actually dispatches via SMS.ir Verify. */
  previewVerifyTemplateCode?: string;
  previewVerifyParameters?: Record<string, string>;
};

function allowedBranchIds(session: AdminSessionContext): readonly string[] | null {
  return session.membership.allBranches ? null : session.membership.branchIds;
}

function revalidateCommerceOps(formData?: FormData) {
  revalidatePath("/admin/commerce/orders");
  revalidatePath("/admin/commerce/production");
  revalidatePath("/admin/commerce/performance");
  revalidatePath("/admin/commerce/pickup");
  const from = String(formData?.get("from") ?? "").trim();
  if (from.startsWith("/admin/commerce/")) {
    revalidatePath(from.split("?")[0] ?? from);
  }
}

export async function createCommerceProductAction(
  _prev: CommerceProductActionState,
  formData: FormData,
): Promise<CommerceProductActionState> {
  const session = await requirePermission("commerce.products.manage");
  const result = await upsertCommerceItemFromForm({
    organizationId: session.organization.id,
    formData,
  });
  if (!result.ok) return { formError: result.error };
  revalidatePath("/admin/commerce/products");
  redirect(`/admin/commerce/products/${result.itemId}`);
}

export async function updateCommerceProductAction(
  _prev: CommerceProductActionState,
  formData: FormData,
): Promise<CommerceProductActionState> {
  const session = await requirePermission("commerce.products.manage");
  const itemId = String(formData.get("itemId") ?? "").trim();
  if (!itemId) return { formError: "شناسه محصول نامعتبر است." };

  const result = await upsertCommerceItemFromForm({
    organizationId: session.organization.id,
    itemId,
    formData,
  });
  if (!result.ok) return { formError: result.error };
  revalidatePath("/admin/commerce/products");
  revalidatePath(`/admin/commerce/products/${itemId}`);
  return { successMessage: "محصول ذخیره شد." };
}

export async function advanceOrderStageAction(
  _prev: CommerceOrderActionState,
  formData: FormData,
): Promise<CommerceOrderActionState> {
  const session = await requirePermission("commerce.orders.manage");
  const orderId = String(formData.get("orderId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!orderId) return { formError: "سفارش نامعتبر است." };

  const result = await advanceCommerceOrderStage({
    organizationId: session.organization.id,
    orderId,
    actorUserId: session.user.id,
    note: note || null,
    handoverStaffUserId: String(formData.get("handoverStaffUserId") ?? "").trim() || null,
    pickupSignedBy: String(formData.get("pickupSignedBy") ?? "").trim() || null,
    pickupSignaturePng: String(formData.get("pickupSignaturePng") ?? "").trim() || null,
    allowedBranchIds: allowedBranchIds(session),
  });
  if (!result.ok) return { formError: result.error };
  revalidateCommerceOps(formData);
  return { successMessage: "مرحله ثبت شد." };
}

export async function rollbackOrderStageAction(
  _prev: CommerceOrderActionState,
  formData: FormData,
): Promise<CommerceOrderActionState> {
  const session = await requirePermission("commerce.orders.rollback");
  const orderId = String(formData.get("orderId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!orderId) return { formError: "سفارش نامعتبر است." };

  const result = await rollbackCommerceOrderStage({
    organizationId: session.organization.id,
    orderId,
    actorUserId: session.user.id,
    note: note || null,
    allowedBranchIds: allowedBranchIds(session),
  });
  if (!result.ok) return { formError: result.error };
  revalidateCommerceOps(formData);
  return { successMessage: "یک مرحله بازگشت داده شد." };
}

export async function addOrderNoteAction(
  _prev: CommerceOrderActionState,
  formData: FormData,
): Promise<CommerceOrderActionState> {
  const session = await requirePermission("commerce.orders.manage");
  const orderId = String(formData.get("orderId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!orderId) return { formError: "سفارش نامعتبر است." };

  const result = await addCommerceOrderNote({
    organizationId: session.organization.id,
    orderId,
    actorUserId: session.user.id,
    body,
    allowedBranchIds: allowedBranchIds(session),
  });
  if (!result.ok) return { formError: result.error };
  revalidateCommerceOps();
  return { successMessage: "یادداشت ثبت شد." };
}

export async function updateOrderDetailsAction(
  _prev: CommerceOrderActionState,
  formData: FormData,
): Promise<CommerceOrderActionState> {
  const session = await requirePermission("commerce.orders.manage");
  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) return { formError: "سفارش نامعتبر است." };

  const result = await updateCommerceOrderDetails({
    organizationId: session.organization.id,
    orderId,
    actorUserId: session.user.id,
    formData,
    allowedBranchIds: allowedBranchIds(session),
  });
  if (!result.ok) return { formError: result.error };
  revalidateCommerceOps();
  return { successMessage: "سفارش به‌روزرسانی شد." };
}

export async function createAdminCommerceOrderAction(
  _prev: CommerceOrderActionState,
  formData: FormData,
): Promise<CommerceOrderActionState> {
  const session = await requirePermission("commerce.orders.manage");
  const itemId = String(formData.get("itemId") ?? "").trim();
  if (!itemId) return { formError: "انتخاب محصول الزامی است." };

  const result = await createSingleItemCommerceOrder({
    organizationId: session.organization.id,
    itemId,
    buyerFirstName: String(formData.get("buyerFirstName") ?? ""),
    buyerLastName: String(formData.get("buyerLastName") ?? ""),
    buyerMobile: String(formData.get("buyerMobile") ?? ""),
    pickupBranchId: String(formData.get("pickupBranchId") ?? "").trim() || null,
    orderBranchId: String(formData.get("branchId") ?? "").trim() || null,
    parentName: String(formData.get("parentName") ?? "").trim() || null,
    buyerNationalCode: String(formData.get("buyerNationalCode") ?? "").trim() || null,
    studentGrade: String(formData.get("studentGrade") ?? "").trim() || null,
    studentMajor: String(formData.get("studentMajor") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    specialNotes: String(formData.get("specialNotes") ?? "").trim() || null,
    urgentDelivery: formData.get("urgentDelivery") === "on" || formData.get("urgentDelivery") === "1",
    preferredPickupAt: String(formData.get("preferredPickupAt") ?? "").trim() || null,
    acquisitionSource: String(formData.get("acquisitionSource") ?? "").trim() || null,
    referredBy: String(formData.get("referredBy") ?? "").trim() || null,
    discountCode: String(formData.get("discountCode") ?? "").trim() || null,
    bookletPaymentMethod: String(formData.get("bookletPaymentMethod") ?? "").trim() || null,
  });
  if (!result.ok) return { formError: result.error };
  revalidateCommerceOps();
  redirect(`/admin/commerce/orders?orderId=${result.orderId}`);
}

export async function bulkCommerceOrdersAction(
  _prev: CommerceOrderActionState,
  formData: FormData,
): Promise<CommerceOrderActionState> {
  const session = await requirePermission("commerce.orders.manage");
  const orderIds = formData
    .getAll("orderIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const intent = String(formData.get("intent") ?? "").trim();
  const handoverStaffUserId =
    String(formData.get("handoverStaffUserId") ?? "").trim() || null;
  const pickupBranchId = String(formData.get("pickupBranchId") ?? "").trim() || null;

  if (intent === "assignStaff" || intent === "assignPickup") {
    const result = await bulkAssignCommerceOrders({
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      orderIds,
      handoverStaffUserId: intent === "assignStaff" ? handoverStaffUserId : null,
      pickupBranchId: intent === "assignPickup" ? pickupBranchId : null,
      allowedBranchIds: allowedBranchIds(session),
    });
    if (!result.ok && result.done === 0) {
      return { formError: result.error ?? "عملیات گروهی انجام نشد." };
    }
    revalidateCommerceOps();
    return {
      successMessage: `${result.done} سفارش به‌روزرسانی شد${result.failed ? ` · ${result.failed} ناموفق` : ""}.`,
    };
  }

  const target =
    intent === "production" ? "production" : intent === "ready" ? "ready" : intent === "deliver" ? "deliver" : null;
  if (!target) return { formError: "عملیات گروهی نامعتبر است." };

  const result = await bulkAdvanceCommerceOrders({
    organizationId: session.organization.id,
    actorUserId: session.user.id,
    orderIds,
    target,
    handoverStaffUserId,
    allowedBranchIds: allowedBranchIds(session),
  });
  if (!result.ok && result.done === 0) {
    return { formError: result.error ?? "عملیات گروهی انجام نشد." };
  }
  revalidateCommerceOps();
  return {
    successMessage: `${result.done} سفارش به‌روزرسانی شد${result.failed ? ` · ${result.failed} ناموفق` : ""}.`,
  };
}

export async function resendOrderSmsAction(
  _prev: CommerceOrderActionState,
  formData: FormData,
): Promise<CommerceOrderActionState> {
  const session = await requirePermission("commerce.orders.manage");
  const orderId = String(formData.get("orderId") ?? "").trim();
  const stageRaw = String(formData.get("stage") ?? "").trim();
  if (!orderId) return { formError: "سفارش نامعتبر است." };
  const stage = isCommerceOpsStage(stageRaw) ? stageRaw : undefined;
  const result = await resendBookletSms({
    organizationId: session.organization.id,
    orderId,
    stage,
  });
  if (!result.ok) return { formError: result.error.message };
  revalidateCommerceOps(formData);
  return { successMessage: "پیامک دوباره ارسال شد." };
}

export async function retryOrderSmsAction(
  _prev: CommerceOrderActionState,
  formData: FormData,
): Promise<CommerceOrderActionState> {
  const session = await requirePermission("commerce.orders.manage");
  const messageId = String(formData.get("messageId") ?? "").trim();
  if (!messageId) return { formError: "پیامک نامعتبر است." };
  const result = await retryBookletSms({
    organizationId: session.organization.id,
    messageId,
  });
  if (!result.ok) return { formError: result.error.message };
  revalidateCommerceOps(formData);
  return { successMessage: "ارسال مجدد انجام شد." };
}

export async function previewOrderSmsAction(
  _prev: CommerceSmsPreviewActionState,
  formData: FormData,
): Promise<CommerceSmsPreviewActionState> {
  const session = await requirePermission("commerce.orders.view");
  const orderId = String(formData.get("orderId") ?? "").trim();
  const stageRaw = String(formData.get("stage") ?? "").trim();
  if (!orderId) return { formError: "سفارش نامعتبر است." };
  const stage = isCommerceOpsStage(stageRaw) ? stageRaw : undefined;

  const result = await previewBookletSms({
    organizationId: session.organization.id,
    orderId,
    stage,
  });
  if (!result.ok) return { formError: result.error.message };
  return {
    successMessage: "پیش‌نمایش ساخته شد.",
    previewBody: result.body,
    previewStage: result.event,
    previewVerifyTemplateCode: result.verify?.templateCode,
    previewVerifyParameters: result.verify?.parameters,
  };
}

export async function sendTestOrderSmsAction(
  _prev: CommerceSmsPreviewActionState,
  formData: FormData,
): Promise<CommerceSmsPreviewActionState> {
  const session = await requirePermission("commerce.orders.manage");
  const orderId = String(formData.get("orderId") ?? "").trim();
  const stageRaw = String(formData.get("stage") ?? "").trim();
  const testMobile = String(formData.get("testMobile") ?? "").trim();
  if (!orderId) return { formError: "سفارش نامعتبر است." };
  if (!testMobile) return { formError: "شماره موبایل آزمایشی را وارد کنید." };
  const stage = isCommerceOpsStage(stageRaw) ? stageRaw : undefined;

  const result = await sendTestBookletSms({
    organizationId: session.organization.id,
    orderId,
    stage,
    testMobile,
  });
  if (!result.ok) return { formError: result.error.message };
  return { successMessage: "پیامک آزمایشی ارسال شد." };
}

export async function markCommerceOpsNotificationsReadAction(): Promise<CommerceOrderActionState> {
  const session = await requirePermission("commerce.orders.view");
  await markCommerceOpsNotificationsRead({
    organizationId: session.organization.id,
    userId: session.user.id,
  });
  revalidateCommerceOps();
  return { successMessage: "اعلان‌ها خوانده شد." };
}
