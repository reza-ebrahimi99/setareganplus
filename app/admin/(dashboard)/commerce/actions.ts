"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { upsertCommerceItemFromForm } from "@/lib/commerce/catalog/service";
import { markCommerceOrderDelivered } from "@/lib/commerce/orders/service";
import { requirePermission } from "@/lib/auth/require-admin";

export type CommerceProductActionState = {
  formError?: string;
  successMessage?: string;
};

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

export async function markOrderDeliveredAction(formData: FormData) {
  const session = await requirePermission("commerce.orders.manage");
  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) return;

  await markCommerceOrderDelivered({
    organizationId: session.organization.id,
    orderId,
    actorUserId: session.user.id,
  });

  revalidatePath("/admin/commerce/orders");
}
