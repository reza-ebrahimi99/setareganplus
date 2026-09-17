"use server";

import { revalidatePath } from "next/cache";
import { AuditAction, BookStockMovementReason } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import {
  adjustBookStock,
  listBookStockMovements,
  reconcileBookStockToAbsolute,
  type PosStockMovementRow,
} from "@/lib/commerce/pos/inventory";
import {
  registerPosSale,
  searchBooksForPos,
  searchStudentsForPos,
  type PosBookOption,
  type PosStudentOption,
  type RegisterPosSaleResult,
} from "@/lib/commerce/pos/sale";

export async function listStockMovementsAction(
  bookSkuId: string,
): Promise<PosStockMovementRow[]> {
  const session = await requirePermission("commerce.products.manage");
  return listBookStockMovements({
    organizationId: session.organization.id,
    bookSkuId,
  });
}

export async function searchPosStudentsAction(q: string): Promise<PosStudentOption[]> {
  const session = await requirePermission("commerce.orders.manage");
  return searchStudentsForPos({ organizationId: session.organization.id, q });
}

export async function searchPosBooksAction(q: string): Promise<PosBookOption[]> {
  const session = await requirePermission("commerce.orders.manage");
  return searchBooksForPos({ organizationId: session.organization.id, q });
}

export type RegisterPosSaleActionInput = {
  lines: { bookSkuId: string; quantity: number }[];
  studentId?: string | null;
  buyerName?: string | null;
  buyerMobile?: string | null;
  paymentMethod?: string | null;
  note?: string | null;
};

export async function registerPosSaleAction(
  input: RegisterPosSaleActionInput,
): Promise<RegisterPosSaleResult> {
  const session = await requirePermission("commerce.orders.manage");
  const result = await registerPosSale({
    organizationId: session.organization.id,
    actorUserId: session.user.id,
    lines: input.lines,
    studentId: input.studentId ?? null,
    buyerName: input.buyerName ?? null,
    buyerMobile: input.buyerMobile ?? null,
    paymentMethod: input.paymentMethod ?? null,
    note: input.note ?? null,
  });
  if (result.ok) {
    revalidatePath("/admin/book-pos/inventory");
  }
  return result;
}

export type AdjustStockActionInput = {
  bookSkuId: string;
  mode: "increase" | "set";
  value: number;
  note?: string | null;
};

export type AdjustStockActionResult =
  | { ok: true; balanceAfter: number }
  | { ok: false; error: string };

export async function adjustStockAction(
  input: AdjustStockActionInput,
): Promise<AdjustStockActionResult> {
  const session = await requirePermission("commerce.products.manage");
  const value = Math.trunc(input.value);
  if (!Number.isInteger(value) || value < 0) {
    return { ok: false, error: "مقدار باید عددی صحیح و نامنفی باشد." };
  }
  if (input.mode === "increase" && value === 0) {
    return { ok: false, error: "مقدار افزایش باید بزرگ‌تر از صفر باشد." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const outcome =
        input.mode === "increase"
          ? await adjustBookStock(tx, {
              organizationId: session.organization.id,
              bookSkuId: input.bookSkuId,
              delta: value,
              reason: BookStockMovementReason.RESTOCK,
              actorUserId: session.user.id,
              note: input.note ?? "افزایش موجودی",
            })
          : await reconcileBookStockToAbsolute(tx, {
              organizationId: session.organization.id,
              bookSkuId: input.bookSkuId,
              desired: value,
              reason: BookStockMovementReason.CORRECTION,
              actorUserId: session.user.id,
              note: input.note ?? "اصلاح موجودی",
            });
      if (!outcome.ok) throw new Error(outcome.error);

      await tx.auditLog.create({
        data: {
          organizationId: session.organization.id,
          actorUserId: session.user.id,
          action: AuditAction.BOOKS_STOCK_ADJUSTED,
          entityType: "BookSku",
          entityId: input.bookSkuId,
          metadata: {
            mode: input.mode,
            value,
            delta: outcome.delta,
            balanceAfter: outcome.balanceAfter,
          },
        },
      });
      return outcome;
    });

    revalidatePath("/admin/book-pos/inventory");
    return { ok: true, balanceAfter: result.balanceAfter };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "به‌روزرسانی موجودی ناموفق بود.",
    };
  }
}
