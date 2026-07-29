"use server";

import { redirect } from "next/navigation";
import { createSingleItemCommerceOrder } from "@/lib/commerce/orders/service";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { startCheckoutForCommerceOrder } from "@/lib/payment/service";

export type ShopCheckoutState = {
  formError?: string;
};

export async function startShopCheckoutAction(
  _prev: ShopCheckoutState,
  formData: FormData,
): Promise<ShopCheckoutState> {
  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    return { formError: "سازمان یافت نشد." };
  }

  const itemId = String(formData.get("itemId") ?? "").trim();
  const buyerFirstName = String(formData.get("buyerFirstName") ?? "").trim();
  const buyerLastName = String(formData.get("buyerLastName") ?? "").trim();
  const buyerMobile = String(formData.get("buyerMobile") ?? "").trim();

  if (!itemId) return { formError: "محصول نامعتبر است." };

  const order = await createSingleItemCommerceOrder({
    organizationId: organization.id,
    itemId,
    buyerFirstName,
    buyerLastName,
    buyerMobile,
  });

  if (!order.ok) return { formError: order.error };

  const checkout = await startCheckoutForCommerceOrder({
    organizationId: organization.id,
    orderId: order.orderId,
  });

  if (!checkout.ok) return { formError: checkout.error };

  redirect(checkout.checkoutUrl);
}
