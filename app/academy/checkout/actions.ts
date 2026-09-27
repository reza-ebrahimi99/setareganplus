"use server";

import { createAcademyOrder } from "@/lib/academy/orders";
import { startAcademyCheckout } from "@/lib/academy/payment";
import { requireAcademySession } from "@/lib/academy/auth/session";
import { getAcademyOrganizationId } from "@/lib/academy/config";

export async function startAcademyCheckoutAction(formData: FormData) {
  const session = await requireAcademySession();
  const organizationId = await getAcademyOrganizationId();

  const courseId = String(formData.get("courseId") ?? "").trim();
  const lessonId = String(formData.get("lessonId") ?? "").trim();
  const discountCode = String(formData.get("discountCode") ?? "").trim() || null;

  const items =
    courseId !== ""
      ? [{ kind: "COURSE" as const, courseId }]
      : lessonId !== ""
        ? [{ kind: "LESSON" as const, lessonId }]
        : [];

  if (items.length === 0) {
    return { ok: false as const, error: "محصول نامعتبر است." };
  }

  const orderResult = await createAcademyOrder({
    organizationId,
    userId: session.userId,
    items,
    discountCode,
    idempotencyKey: `checkout:${session.userId}:${courseId || lessonId}`,
  });

  if (!orderResult.ok) {
    return { ok: false as const, error: orderResult.error };
  }

  const pay = await startAcademyCheckout({
    organizationId,
    orderId: orderResult.order.id,
    userId: session.userId,
  });

  if (!pay.ok) {
    return { ok: false as const, error: pay.error };
  }

  return { ok: true as const, checkoutUrl: pay.checkoutUrl };
}
