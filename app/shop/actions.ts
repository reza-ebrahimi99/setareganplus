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
  } catch (error) {
    console.error("[shop] organization resolve failed", error);
    return { formError: "سازمان یافت نشد." };
  }

  const itemId = String(formData.get("itemId") ?? "").trim();
  const buyerFirstName = String(formData.get("buyerFirstName") ?? "").trim();
  const buyerLastName = String(formData.get("buyerLastName") ?? "").trim();
  const buyerMobile = String(formData.get("buyerMobile") ?? "").trim();

  if (!itemId) return { formError: "محصول نامعتبر است." };

  console.info("[shop] checkout start", {
    organizationId: organization.id,
    itemId,
  });

  const order = await createSingleItemCommerceOrder({
    organizationId: organization.id,
    itemId,
    buyerFirstName,
    buyerLastName,
    buyerMobile,
  });

  if (!order.ok) {
    console.error("[shop] create order failed", {
      organizationId: organization.id,
      itemId,
      error: order.error,
    });
    return { formError: order.error };
  }

  console.info("[shop] order created", {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    grandTotalRials: order.grandTotalRials,
  });

  const checkout = await startCheckoutForCommerceOrder({
    organizationId: organization.id,
    orderId: order.orderId,
  });

  if (!checkout.ok) {
    console.error("[shop] checkout failed after order create", {
      orderId: order.orderId,
      error: checkout.error,
    });
    return { formError: checkout.error };
  }

  console.info("[shop] redirecting to payment provider", {
    orderId: order.orderId,
    checkoutUrlHost: (() => {
      try {
        return new URL(checkout.checkoutUrl).host;
      } catch {
        return "invalid-url";
      }
    })(),
  });

  redirect(checkout.checkoutUrl);
}
