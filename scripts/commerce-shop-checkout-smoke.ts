/**
 * Smoke: create a single-item commerce order against the live DB.
 * Requires DATABASE_URL. Optional: SHOP_SMOKE_ITEM_ID or picks first ACTIVE item.
 *
 *   npx tsx scripts/commerce-shop-checkout-smoke.ts
 */

import {
  CommerceItemStatus,
  CommerceOrderPaymentStatus,
} from "../generated/prisma/enums";
import { createSingleItemCommerceOrder } from "../lib/commerce/orders/service";
import { prisma } from "../lib/prisma";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const org = await prisma.organization.findFirst({
    where: { slug: "setareganplus", deletedAt: null, isActive: true },
    select: { id: true, slug: true },
  });
  if (!org) throw new Error("Organization setareganplus not found");

  const forcedItemId = process.env.SHOP_SMOKE_ITEM_ID?.trim() || null;
  const item = await prisma.commerceItem.findFirst({
    where: {
      organizationId: org.id,
      deletedAt: null,
      isVisible: true,
      status: CommerceItemStatus.ACTIVE,
      ...(forcedItemId ? { id: forcedItemId } : {}),
    },
    include: {
      primaryImage: { select: { storageKey: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!item) throw new Error("No ACTIVE visible commerce item found");

  console.log("item", {
    id: item.id,
    slug: item.slug,
    status: item.status,
    stockQuantity: item.stockQuantity,
    trackInventory: item.trackInventory,
    unlimitedStock: item.unlimitedStock,
    organizationId: item.organizationId,
    imageStorageKey: item.primaryImage?.storageKey ?? null,
    imageStatus: item.primaryImage?.status ?? null,
  });

  const result = await createSingleItemCommerceOrder({
    organizationId: org.id,
    itemId: item.id,
    buyerFirstName: "تست",
    buyerLastName: "سفارش",
    buyerMobile: "09121234567",
  });

  console.log("createOrder", result);

  if (!result.ok) {
    process.exitCode = 1;
    return;
  }

  const order = await prisma.commerceOrder.findFirst({
    where: { id: result.orderId, organizationId: org.id },
    include: { items: true },
  });
  console.log("persistedOrder", {
    id: order?.id,
    orderNumber: order?.orderNumber,
    paymentStatus: order?.paymentStatus,
    status: order?.status,
    deliveryMethod: order?.deliveryMethod,
    fulfillmentStatus: order?.fulfillmentStatus,
    lineCount: order?.items.length,
    grandTotalRials: order?.grandTotalRials,
  });

  if (order?.paymentStatus !== CommerceOrderPaymentStatus.PENDING) {
    throw new Error("Expected PENDING paymentStatus on new order");
  }
  if (!order?.items.length) {
    throw new Error("Expected at least one order line");
  }

  console.log("\nOK — order create path works (checkout/Zibal not invoked).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
