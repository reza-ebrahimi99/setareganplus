/**
 * Ghalamchi Book POS — register a fast counter sale.
 *
 * A POS sale is an immediate, cash/card-paid, on-site handover. It reuses the
 * canonical CommerceOrder/CommerceOrderItem models, decrements stock through the
 * audited BookStockMovement ledger, and mints an invoice number from the
 * existing DocumentSequence counter — all inside one transaction.
 */

import {
  AuditAction,
  BookSkuStatus,
  BookStockMovementReason,
  CommerceBookletPaymentMethod,
  CommerceDeliveryMethod,
  CommerceFulfillmentStatus,
  CommerceOpsStage,
  CommerceOrderEventType,
  CommerceOrderPaymentStatus,
  CommerceOrderStatus,
  CommerceSystemKind,
} from "@/generated/prisma/enums";
import { toShopPriceInput } from "@/lib/books/catalog/price";
import { formatDocumentNumber, nextDocumentSequenceValue } from "@/lib/books/catalog/sequence";
import { adjustBookStock } from "@/lib/commerce/pos/inventory";
import { resolveCommercePrice } from "@/lib/commerce/pricing";
import { generateCommerceOrderShortCode } from "@/lib/commerce/orders/short-code";
import { calculateOrderTotals } from "@/lib/commerce/orders/totals";
import { recordCommerceOrderEvent } from "@/lib/commerce/orders/timeline";
import { COMMERCE_OPS_ACTIVITY_TITLES } from "@/lib/commerce/orders/ops-stage";
import { prisma } from "@/lib/prisma";

const POS_INVOICE_DOC_TYPE = "POS_INVOICE";
const POS_INVOICE_PREFIX = "F";

const PAYMENT_METHODS = new Set<CommerceBookletPaymentMethod>([
  CommerceBookletPaymentMethod.CASH,
  CommerceBookletPaymentMethod.CARD,
  CommerceBookletPaymentMethod.TRANSFER,
]);

export type PosSaleLineInput = { bookSkuId: string; quantity: number };

export type RegisterPosSaleInput = {
  organizationId: string;
  actorUserId: string;
  lines: readonly PosSaleLineInput[];
  /** Existing SetareganPlus student (preferred). */
  studentId?: string | null;
  /** Buyer snapshot — required when no student is selected, optional otherwise. */
  buyerName?: string | null;
  buyerMobile?: string | null;
  paymentMethod?: string | null;
  note?: string | null;
};

export type RegisterPosSaleResult =
  | { ok: true; orderId: string; invoiceNumber: string; grandTotalRials: number }
  | { ok: false; error: string };

export async function registerPosSale(
  input: RegisterPosSaleInput,
): Promise<RegisterPosSaleResult> {
  const rawLines = input.lines
    .map((l) => ({ bookSkuId: String(l.bookSkuId).trim(), quantity: Math.trunc(l.quantity) }))
    .filter((l) => l.bookSkuId);
  if (rawLines.length === 0) {
    return { ok: false, error: "حداقل یک کتاب باید انتخاب شود." };
  }
  for (const line of rawLines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      return { ok: false, error: "تعداد هر کتاب باید عدد صحیح مثبت باشد." };
    }
  }

  // Merge duplicate lines (same book scanned twice) into a single quantity.
  const mergedBySku = new Map<string, number>();
  for (const line of rawLines) {
    mergedBySku.set(line.bookSkuId, (mergedBySku.get(line.bookSkuId) ?? 0) + line.quantity);
  }
  const mergedLines = Array.from(mergedBySku.entries()).map(([bookSkuId, quantity]) => ({
    bookSkuId,
    quantity,
  }));

  const skus = await prisma.bookSku.findMany({
    where: {
      organizationId: input.organizationId,
      id: { in: mergedLines.map((l) => l.bookSkuId) },
      deletedAt: null,
    },
    select: {
      id: true,
      internalCode: true,
      status: true,
      systemKind: true,
      trackInventory: true,
      unlimitedStock: true,
      stockQuantity: true,
      title: { select: { title: true } },
      prices: {
        select: {
          id: true,
          kind: true,
          amountRials: true,
          effectiveFrom: true,
          effectiveTo: true,
        },
      },
    },
  });
  const skuById = new Map(skus.map((s) => [s.id, s]));

  const lineInputs = [];
  for (const line of mergedLines) {
    const sku = skuById.get(line.bookSkuId);
    if (!sku) return { ok: false, error: "یکی از کتاب‌های انتخاب‌شده یافت نشد." };
    if (sku.status !== BookSkuStatus.ACTIVE) {
      return { ok: false, error: `کتاب «${sku.title.title}» فعال نیست.` };
    }
    if (
      sku.trackInventory &&
      !sku.unlimitedStock &&
      (sku.stockQuantity ?? 0) < line.quantity
    ) {
      return {
        ok: false,
        error: `موجودی «${sku.title.title}» کافی نیست (موجودی: ${sku.stockQuantity ?? 0}).`,
      };
    }
    const pricing = resolveCommercePrice(toShopPriceInput(sku.prices));
    lineInputs.push({
      itemId: sku.id,
      titleSnapshot: sku.title.title,
      skuSnapshot: sku.internalCode,
      systemKindSnapshot: sku.systemKind as CommerceSystemKind,
      unitPriceRials: pricing.finalPriceRials,
      quantity: line.quantity,
      discountRials: 0,
    });
  }

  let totals;
  try {
    totals = calculateOrderTotals({ lines: lineInputs, taxRials: 0, shippingRials: 0 });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "محاسبه مبلغ فاکتور ناموفق بود.",
    };
  }

  // Buyer snapshot: prefer a linked student, else the manual fields.
  let studentId: string | null = null;
  let buyerName = (input.buyerName ?? "").trim() || null;
  let buyerFirstName: string | null = null;
  let buyerLastName: string | null = null;
  if (input.studentId) {
    const student = await prisma.student.findFirst({
      where: { id: input.studentId, organizationId: input.organizationId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, fullName: true },
    });
    if (!student) return { ok: false, error: "دانش‌آموز انتخاب‌شده یافت نشد." };
    studentId = student.id;
    buyerName = student.fullName || `${student.firstName} ${student.lastName}`.trim();
    buyerFirstName = student.firstName;
    buyerLastName = student.lastName;
  }
  if (!studentId && !buyerName) {
    return { ok: false, error: "نام خریدار یا انتخاب دانش‌آموز الزامی است." };
  }

  const paymentMethodRaw = (input.paymentMethod ?? "").trim().toUpperCase();
  const paymentMethod = PAYMENT_METHODS.has(paymentMethodRaw as CommerceBookletPaymentMethod)
    ? (paymentMethodRaw as CommerceBookletPaymentMethod)
    : CommerceBookletPaymentMethod.CASH;

  // Allocate the invoice number before the transaction. DocumentSequence is
  // atomic; a rare rollback only skips a number, which is acceptable.
  const now = new Date();
  const periodKey = String(now.getUTCFullYear());
  const seq = await nextDocumentSequenceValue({
    organizationId: input.organizationId,
    documentType: POS_INVOICE_DOC_TYPE,
    periodKey,
    prefix: POS_INVOICE_PREFIX,
  });
  const invoiceNumber = formatDocumentNumber(POS_INVOICE_PREFIX, periodKey, seq);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.commerceOrder.create({
        data: {
          organizationId: input.organizationId,
          orderNumber: invoiceNumber,
          shortCode: generateCommerceOrderShortCode(),
          status: CommerceOrderStatus.COMPLETED,
          paymentStatus: CommerceOrderPaymentStatus.PAID,
          opsStage: CommerceOpsStage.DELIVERED_TO_STUDENT,
          fulfillmentStatus: CommerceFulfillmentStatus.DELIVERED,
          deliveryMethod: CommerceDeliveryMethod.PICKUP_ONSITE,
          bookletPaymentMethod: paymentMethod,
          studentId,
          buyerName,
          buyerFirstName,
          buyerLastName,
          buyerMobile: (input.buyerMobile ?? "").trim() || null,
          subtotalRials: totals.subtotalRials,
          discountRials: totals.discountRials,
          taxRials: totals.taxRials,
          shippingRials: 0,
          grandTotalRials: totals.grandTotalRials,
          currency: "IRR",
          deliveredAt: now,
          deliveredByUserId: input.actorUserId,
          handoverStaffUserId: input.actorUserId,
          readyForPickupAt: now,
          readyForPickupByUserId: input.actorUserId,
          notes: (input.note ?? "").trim() || null,
          metadata: { posSale: true },
        },
        select: { id: true, orderNumber: true, grandTotalRials: true },
      });

      await tx.commerceOrderItem.createMany({
        data: totals.lines.map((line) => ({
          organizationId: input.organizationId,
          orderId: order.id,
          bookSkuId: line.itemId,
          titleSnapshot: line.titleSnapshot,
          skuSnapshot: line.skuSnapshot,
          systemKindSnapshot: line.systemKindSnapshot as CommerceSystemKind,
          unitPriceRials: line.unitPriceRials,
          quantity: line.quantity,
          discountRials: line.discountRials,
          totalRials: line.totalRials,
        })),
      });

      for (const line of totals.lines) {
        if (!line.itemId) continue;
        const sku = skuById.get(line.itemId);
        // Only tracked, limited-stock books move the ledger. Unlimited/untracked
        // books (rare for physical POS) are sold without a stock movement.
        if (sku && sku.trackInventory && !sku.unlimitedStock) {
          const res = await adjustBookStock(tx, {
            organizationId: input.organizationId,
            bookSkuId: line.itemId,
            delta: -line.quantity,
            reason: BookStockMovementReason.SALE,
            actorUserId: input.actorUserId,
            orderId: order.id,
            note: `فروش فاکتور ${invoiceNumber}`,
          });
          if (!res.ok) {
            throw new Error(res.error);
          }
        }
      }

      await recordCommerceOrderEvent(tx, {
        organizationId: input.organizationId,
        orderId: order.id,
        eventType: CommerceOrderEventType.STAGE_CHANGED,
        stage: "DELIVERED_TO_STUDENT",
        title: COMMERCE_OPS_ACTIVITY_TITLES.DELIVERED_TO_STUDENT,
        note: `فروش حضوری — فاکتور ${invoiceNumber}`,
        actorUserId: input.actorUserId,
      });

      await tx.auditLog.create({
        data: {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          action: AuditAction.BOOKS_POS_SALE,
          entityType: "CommerceOrder",
          entityId: order.id,
          metadata: {
            invoiceNumber,
            grandTotalRials: order.grandTotalRials,
            lineCount: totals.lines.length,
            studentId,
          },
        },
      });

      return order;
    });

    return {
      ok: true,
      orderId: created.id,
      invoiceNumber: created.orderNumber,
      grandTotalRials: created.grandTotalRials,
    };
  } catch (error) {
    console.error("[book-pos] registerPosSale failed", error);
    const devDetail =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? ` (${error.message})`
        : "";
    // Surface known stock errors directly.
    if (error instanceof Error && error.message.includes("موجودی")) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: `ثبت فروش ناموفق بود.${devDetail}` };
  }
}

export type PosStudentOption = {
  id: string;
  fullName: string;
  gradeLabel: string | null;
  kanoonStudentId: string | null;
};

export async function searchStudentsForPos(params: {
  organizationId: string;
  q: string;
  take?: number;
}): Promise<PosStudentOption[]> {
  const q = params.q.trim();
  if (q.length < 2) return [];
  const students = await prisma.student.findMany({
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
      isActive: true,
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { kanoonStudentId: { contains: q } },
      ],
    },
    orderBy: { fullName: "asc" },
    take: Math.min(Math.max(params.take ?? 15, 1), 50),
    select: {
      id: true,
      fullName: true,
      kanoonStudentId: true,
      grade: { select: { name: true } },
    },
  });
  return students.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    gradeLabel: s.grade?.name ?? null,
    kanoonStudentId: s.kanoonStudentId,
  }));
}

export type PosBookOption = {
  id: string;
  title: string;
  internalCode: string;
  barcode: string | null;
  gradeLabel: string | null;
  priceRials: number;
  currentStock: number | null;
  unlimitedStock: boolean;
  imageUrl: string | null;
};

export async function searchBooksForPos(params: {
  organizationId: string;
  q: string;
  take?: number;
}): Promise<PosBookOption[]> {
  const { publicLibraryUrl } = await import("@/lib/media/library-image");
  const { resolveCommercePrice } = await import("@/lib/commerce/pricing");

  const q = params.q.trim();
  const skus = await prisma.bookSku.findMany({
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
      status: BookSkuStatus.ACTIVE,
      ...(q
        ? {
            OR: [
              { internalCode: { contains: q, mode: "insensitive" } },
              { barcode: { contains: q, mode: "insensitive" } },
              { title: { title: { contains: q, mode: "insensitive" } } },
              { searchText: { contains: q.toLocaleLowerCase("fa") } },
            ],
          }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    take: Math.min(Math.max(params.take ?? 20, 1), 50),
    select: {
      id: true,
      internalCode: true,
      barcode: true,
      gradeLabel: true,
      stockQuantity: true,
      unlimitedStock: true,
      title: { select: { title: true } },
      prices: {
        select: {
          id: true,
          kind: true,
          amountRials: true,
          effectiveFrom: true,
          effectiveTo: true,
        },
      },
      primaryImage: { select: { storageKey: true, status: true } },
    },
  });

  return skus.map((sku) => ({
    id: sku.id,
    title: sku.title.title,
    internalCode: sku.internalCode,
    barcode: sku.barcode,
    gradeLabel: sku.gradeLabel,
    priceRials: resolveCommercePrice(toShopPriceInput(sku.prices)).finalPriceRials,
    currentStock: sku.unlimitedStock ? null : sku.stockQuantity ?? 0,
    unlimitedStock: sku.unlimitedStock,
    imageUrl:
      sku.primaryImage?.status === "ACTIVE"
        ? publicLibraryUrl(sku.primaryImage.storageKey)
        : null,
  }));
}
