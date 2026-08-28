"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { AuditAction } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireBookCommerceAccess } from "@/lib/books/require";

export type BookTypeActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function slugCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_\u0600-\u06FF]/g, "")
    .slice(0, 40);
}

export async function createBookTypeAction(
  _prev: BookTypeActionState,
  formData: FormData,
): Promise<BookTypeActionState> {
  const session = await requireBookCommerceAccess("books.catalog.manage");
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { status: "error", message: "عنوان نوع کتاب الزامی است." };

  const code = slugCode(String(formData.get("code") ?? label));
  if (!code) return { status: "error", message: "کد نوع کتاب معتبر نیست." };

  const existing = await prisma.bookType.findFirst({
    where: { organizationId: session.organization.id, code },
    select: { id: true },
  });
  if (existing) return { status: "error", message: "این کد قبلاً استفاده شده است." };

  const maxSortOrder = await prisma.bookType.aggregate({
    where: { organizationId: session.organization.id },
    _max: { sortOrder: true },
  });

  const type = await prisma.bookType.create({
    data: {
      organizationId: session.organization.id,
      code,
      label,
      sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 10,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      action: AuditAction.BOOKS_CATALOG_TYPE_SAVED,
      entityType: "BookType",
      entityId: type.id,
      metadata: { code, label },
    },
  });

  revalidatePath("/admin/books/catalog/types");
  return { status: "success", message: `نوع کتاب «${label}» افزوده شد.` };
}

export async function updateBookTypeAction(
  _prev: BookTypeActionState,
  formData: FormData,
): Promise<BookTypeActionState> {
  const session = await requireBookCommerceAccess("books.catalog.manage");
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const isActive = formData.get("isActive") === "on";

  if (!id) return { status: "error", message: "شناسه نامعتبر است." };
  if (!label) return { status: "error", message: "عنوان نوع کتاب الزامی است." };

  const existing = await prisma.bookType.findFirst({
    where: { id, organizationId: session.organization.id },
  });
  if (!existing) return { status: "error", message: "نوع کتاب یافت نشد." };

  await prisma.bookType.update({
    where: { id },
    data: {
      label,
      sortOrder: Number.isFinite(sortOrder) ? Math.round(sortOrder) : existing.sortOrder,
      isActive,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      action: AuditAction.BOOKS_CATALOG_TYPE_SAVED,
      entityType: "BookType",
      entityId: id,
      metadata: { label, sortOrder, isActive } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/admin/books/catalog/types");
  return { status: "success", message: "نوع کتاب به‌روزرسانی شد." };
}
