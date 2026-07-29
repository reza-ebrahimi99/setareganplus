/**
 * Commerce order paid SMS (optional). Failures never fail payment finalize.
 * Uses existing SMS.ir enqueue infrastructure.
 */

import { enqueueSms } from "@/lib/communication/queue";
import { prisma } from "@/lib/prisma";

const DEFAULT_BODY =
  "خرید شما از مؤسسه آموزشی ستارگان با موفقیت ثبت شد. شماره سفارش: {{orderNumber}}. تحویل محصول به‌صورت حضوری انجام می‌شود.";

export async function enqueueCommerceOrderPaidSms(params: {
  organizationId: string;
  orderId: string;
}): Promise<void> {
  try {
    const order = await prisma.commerceOrder.findFirst({
      where: {
        id: params.orderId,
        organizationId: params.organizationId,
      },
      select: {
        id: true,
        orderNumber: true,
        buyerMobile: true,
        buyerName: true,
      },
    });
    if (!order?.buyerMobile) return;

    const body = DEFAULT_BODY.replaceAll("{{orderNumber}}", order.orderNumber);

    await enqueueSms({
      organizationId: params.organizationId,
      toMobile: order.buyerMobile,
      body,
      purpose: "commerce_order_paid",
      idempotencyKey: `commerce_order_paid:${order.id}:user`,
      relatedType: "CommerceOrder",
      relatedId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        buyerName: order.buyerName ?? null,
      },
    });
  } catch (error) {
    console.error("[commerce-sms] enqueue failed", {
      orderId: params.orderId,
      error,
    });
  }
}
