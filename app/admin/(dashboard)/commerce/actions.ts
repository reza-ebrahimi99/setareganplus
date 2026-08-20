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

function allowedBranchIds(session: AdminSessionContext): readonly string[] | null {
  return session.membership.allBranches ? null : session.membership.branchIds;
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
    allowedBranchIds: allowedBranchIds(session),
  });
  if (!result.ok) return { formError: result.error };
  revalidatePath("/admin/commerce/orders");
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
  revalidatePath("/admin/commerce/orders");
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
  revalidatePath("/admin/commerce/orders");
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
  revalidatePath("/admin/commerce/orders");
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
  revalidatePath("/admin/commerce/orders");
  redirect(`/admin/commerce/orders?orderId=${result.orderId}`);
}
