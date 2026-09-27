import { randomBytes } from "node:crypto";
import { AcademyOrderStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { calculateCheckout, type CheckoutItemInput } from "@/lib/academy/pricing";

function newOrderNumber(): string {
  return `AC-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

export async function createAcademyOrder(params: {
  organizationId: string;
  userId: string;
  items: CheckoutItemInput[];
  discountCode?: string | null;
  idempotencyKey?: string | null;
}) {
  const quoted = await calculateCheckout({
    organizationId: params.organizationId,
    userId: params.userId,
    items: params.items,
    discountCode: params.discountCode,
  });
  if (!quoted.ok) {
    return { ok: false as const, error: quoted.error };
  }

  const { quote } = quoted;

  if (params.idempotencyKey) {
    const existing = await prisma.academyOrder.findFirst({
      where: {
        organizationId: params.organizationId,
        userId: params.userId,
        idempotencyKey: params.idempotencyKey,
        status: { in: [AcademyOrderStatus.PENDING, AcademyOrderStatus.PAID] },
      },
      select: { id: true, orderNumber: true, totalRials: true },
    });
    if (existing) {
      return { ok: true as const, order: existing, reused: true };
    }
  }

  const line = quote.lines[0]!;
  const order = await prisma.academyOrder.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      orderNumber: newOrderNumber(),
      status: AcademyOrderStatus.PENDING,
      subtotalRials: quote.subtotalRials,
      discountRials: quote.discountRials,
      totalRials: quote.totalRials,
      discountCodeId: quote.discountCodeId,
      discountCodeLabel: quote.discountCodeLabel,
      idempotencyKey: params.idempotencyKey ?? null,
      items: {
        create: {
          organizationId: params.organizationId,
          courseId: line.courseId,
          lessonId: line.lessonId,
          titleSnapshot: line.title,
          unitPriceRials: line.unitPriceRials,
          compareAtPriceRials: line.compareAtPriceRials,
          lineTotalRials: line.lineTotalRials,
        },
      },
    },
    select: { id: true, orderNumber: true, totalRials: true },
  });

  return { ok: true as const, order, reused: false };
}
