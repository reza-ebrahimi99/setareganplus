import { PaymentStatus } from "@/generated/prisma/enums";

const ALLOWED: Record<PaymentStatus, ReadonlySet<PaymentStatus>> = {
  [PaymentStatus.PENDING]: new Set([
    PaymentStatus.PROCESSING,
    PaymentStatus.CANCELLED,
    PaymentStatus.EXPIRED,
  ]),
  [PaymentStatus.PROCESSING]: new Set([
    PaymentStatus.PAID,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
    PaymentStatus.EXPIRED,
  ]),
  [PaymentStatus.FAILED]: new Set([PaymentStatus.PROCESSING]),
  [PaymentStatus.CANCELLED]: new Set([PaymentStatus.PROCESSING]),
  [PaymentStatus.EXPIRED]: new Set([PaymentStatus.PROCESSING]),
  [PaymentStatus.PAID]: new Set(),
  [PaymentStatus.REFUNDED]: new Set(),
};

export function canTransitionPaymentStatus(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  if (from === to) {
    return true;
  }
  return ALLOWED[from]?.has(to) ?? false;
}

export function assertPaymentTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): void {
  if (!canTransitionPaymentStatus(from, to)) {
    throw new Error(`Invalid payment status transition: ${from} → ${to}`);
  }
}

export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return (
    status === PaymentStatus.PAID ||
    status === PaymentStatus.REFUNDED ||
    status === PaymentStatus.EXPIRED
  );
}

export function isRetryablePaymentStatus(status: PaymentStatus): boolean {
  return (
    status === PaymentStatus.FAILED || status === PaymentStatus.CANCELLED
  );
}
