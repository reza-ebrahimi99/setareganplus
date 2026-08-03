/**
 * Commerce order paid SMS (buyer + admin managers).
 * Failures never fail payment finalize. Actual send is via SMS queue worker.
 */

import { enqueueSms } from "@/lib/communication/queue";
import { listEnabledCommerceAdminSmsRecipients } from "@/lib/commerce/notification-settings";
import { formatRials } from "@/lib/registration/format";
import { prisma } from "@/lib/prisma";

const DEFAULT_BUYER_BODY =
  "خرید شما از مؤسسه آموزشی ستارگان با موفقیت ثبت شد. شماره سفارش: {{orderNumber}}. تحویل محصول به‌صورت حضوری انجام می‌شود.";

function buildAdminPaidOrderBody(params: {
  customerName: string;
  mobile: string;
  productList: string;
  formattedAmount: string;
  orderNumber: string;
}): string {
  return [
    "سفارش جدید فروشگاه",
    "",
    "نام:",
    params.customerName,
    "",
    "موبایل:",
    params.mobile,
    "",
    "محصولات:",
    params.productList,
    "",
    "مبلغ:",
    params.formattedAmount,
    "",
    "شماره سفارش:",
    params.orderNumber,
  ].join("\n");
}

/**
 * Enqueue buyer receipt SMS + one SMS per enabled manager recipient.
 * Safe to call without awaiting from payment callback (background queue).
 */
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
        grandTotalRials: true,
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            titleSnapshot: true,
            quantity: true,
          },
        },
      },
    });
    if (!order) return;

    const orderNumber = order.orderNumber;
    const customerName = (order.buyerName ?? "—").trim() || "—";
    const mobile = (order.buyerMobile ?? "—").trim() || "—";
    const productList =
      order.items.length > 0
        ? order.items
            .map((item) => `${item.titleSnapshot} × ${item.quantity}`)
            .join("، ")
        : "—";
    const formattedAmount = formatRials(order.grandTotalRials);

    if (order.buyerMobile) {
      const body = DEFAULT_BUYER_BODY.replaceAll("{{orderNumber}}", orderNumber);
      await enqueueSms({
        organizationId: params.organizationId,
        toMobile: order.buyerMobile,
        body,
        purpose: "commerce_order_paid",
        idempotencyKey: `commerce_order_paid:${order.id}:user`,
        relatedType: "CommerceOrder",
        relatedId: order.id,
        metadata: {
          orderNumber,
          buyerName: order.buyerName ?? null,
          recipientRole: "buyer",
        },
      });
    }

    const adminRecipients = await listEnabledCommerceAdminSmsRecipients(
      params.organizationId,
    );
    if (adminRecipients.length === 0) return;

    const adminBody = buildAdminPaidOrderBody({
      customerName,
      mobile,
      productList,
      formattedAmount,
      orderNumber,
    });

    for (const recipient of adminRecipients) {
      await enqueueSms({
        organizationId: params.organizationId,
        toMobile: recipient,
        body: adminBody,
        purpose: "commerce_order_paid_admin",
        idempotencyKey: `commerce_order_paid:${order.id}:admin:${recipient}`,
        relatedType: "CommerceOrder",
        relatedId: order.id,
        metadata: {
          orderNumber,
          buyerName: order.buyerName ?? null,
          recipientRole: "admin",
        },
      });
    }
  } catch (error) {
    console.error("[commerce-sms] enqueue failed", {
      orderId: params.orderId,
      error,
    });
  }
}
