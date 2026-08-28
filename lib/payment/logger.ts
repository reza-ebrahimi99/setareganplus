import type { PaymentStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type PaymentLogInput = {
  organizationId: string;
  paymentIntentId: string;
  fromStatus: PaymentStatus | null;
  toStatus: PaymentStatus;
  event: string;
  message?: string;
  metadata?: Prisma.InputJsonValue;
  tx?: Prisma.TransactionClient;
};

/**
 * Append-only payment event logger.
 */
export async function logPaymentEvent(input: PaymentLogInput): Promise<void> {
  const client = input.tx ?? prisma;
  await client.paymentEventLog.create({
    data: {
      organizationId: input.organizationId,
      paymentIntentId: input.paymentIntentId,
      fromStatus: input.fromStatus ?? undefined,
      toStatus: input.toStatus,
      event: input.event,
      message: input.message ?? null,
      metadata: input.metadata,
    },
  });
}
