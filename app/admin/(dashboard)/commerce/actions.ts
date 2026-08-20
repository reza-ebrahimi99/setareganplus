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
    buyerName: String(formData.get("buyerName") ?? ""),
    buyerMobile: String(formData.get("buyerMobile") ?? ""),
    branchId: String(formData.get("branchId") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? ""),
    allowedBranchIds: allowedBranchIds(session),
  });
  if (!result.ok) return { formError: result.error };
  revalidatePath("/admin/commerce/orders");
  return { successMessage: "سفارش به‌روزرسانی شد." };
}
