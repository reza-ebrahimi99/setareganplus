"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  addCommerceNotificationRecipient,
  removeCommerceNotificationRecipient,
  setCommerceNotificationEnabled,
  setCommerceNotificationRecipientEnabled,
} from "@/lib/commerce/notification-settings";

const PATH = "/admin/settings/commerce-notifications";

export async function setCommerceNotifyEnabledAction(formData: FormData) {
  const session = await requirePermission("commerce.orders.manage");
  const enabled = String(formData.get("enabled") ?? "") === "1";
  await setCommerceNotificationEnabled({
    organizationId: session.organization.id,
    enabled,
  });
  revalidatePath(PATH);
}

export async function addCommerceNotifyRecipientAction(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requirePermission("commerce.orders.manage");
  const mobile = String(formData.get("mobile") ?? "");
  const result = await addCommerceNotificationRecipient({
    organizationId: session.organization.id,
    mobile,
  });
  revalidatePath(PATH);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

export async function removeCommerceNotifyRecipientAction(formData: FormData) {
  const session = await requirePermission("commerce.orders.manage");
  const recipientId = String(formData.get("recipientId") ?? "").trim();
  if (!recipientId) return;
  await removeCommerceNotificationRecipient({
    organizationId: session.organization.id,
    recipientId,
  });
  revalidatePath(PATH);
}

export async function toggleCommerceNotifyRecipientAction(formData: FormData) {
  const session = await requirePermission("commerce.orders.manage");
  const recipientId = String(formData.get("recipientId") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "") === "1";
  if (!recipientId) return;
  await setCommerceNotificationRecipientEnabled({
    organizationId: session.organization.id,
    recipientId,
    enabled,
  });
  revalidatePath(PATH);
}
