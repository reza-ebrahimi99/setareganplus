"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuditAction, BookSkuStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  BookCatalogError,
  createBookSku,
  updateBookSku,
  type BookSkuFormInput,
} from "@/lib/books/catalog/sku-service";
import { requireBookCommerceAccess } from "@/lib/books/require";

export type BookSkuActionState = {
  status: "idle" | "error";
  message: string;
};

function readOptionalId(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPriceRials(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

function buildInput(formData: FormData): BookSkuFormInput {
  const statusRaw = String(formData.get("status") ?? "ACTIVE");
  const status = (Object.values(BookSkuStatus) as string[]).includes(statusRaw)
    ? (statusRaw as BookSkuStatus)
    : BookSkuStatus.ACTIVE;

  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    keywords: String(formData.get("keywords") ?? "").trim() || null,
    publisherId: readOptionalId(formData, "publisherId"),
    bookTypeId: readOptionalId(formData, "bookTypeId"),
    gradeId: readOptionalId(formData, "gradeId"),
    subjectId: readOptionalId(formData, "subjectId"),
    majorId: readOptionalId(formData, "majorId"),
    internalCode: String(formData.get("internalCode") ?? "").trim(),
    barcode: String(formData.get("barcode") ?? "").trim() || null,
    editionLabel: String(formData.get("editionLabel") ?? "").trim() || null,
    editionYear: String(formData.get("editionYear") ?? "").trim() || null,
    status,
    listPriceRials: readPriceRials(formData, "listPriceRials") ?? 0,
    salePriceRials: readPriceRials(formData, "salePriceRials"),
    tagNames: String(formData.get("tagNames") ?? "")
      .split(/[,،]/)
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

export async function createBookSkuAction(
  _prev: BookSkuActionState,
  formData: FormData,
): Promise<BookSkuActionState> {
  const session = await requireBookCommerceAccess("books.catalog.manage");
  const input = buildInput(formData);

  if (!input.title) return { status: "error", message: "عنوان کتاب الزامی است." };
  if (!input.internalCode) return { status: "error", message: "کد داخلی الزامی است." };
  if (input.listPriceRials <= 0) {
    return { status: "error", message: "قیمت فهرست باید بزرگ‌تر از صفر باشد." };
  }

  let skuId: string;
  try {
    const sku = await createBookSku({
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      input,
    });
    skuId = sku.id;
  } catch (error) {
    if (error instanceof BookCatalogError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  await prisma.auditLog.create({
    data: {
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      action: AuditAction.BOOKS_CATALOG_SKU_CREATED,
      entityType: "BookSku",
      entityId: skuId,
      metadata: { internalCode: input.internalCode },
    },
  });

  revalidatePath("/admin/books/catalog");
  redirect(`/admin/books/catalog/${skuId}`);
}

export async function updateBookSkuAction(
  _prev: BookSkuActionState,
  formData: FormData,
): Promise<BookSkuActionState> {
  const session = await requireBookCommerceAccess("books.catalog.manage");
  const skuId = String(formData.get("skuId") ?? "");
  if (!skuId) return { status: "error", message: "شناسه کتاب نامعتبر است." };

  const input = buildInput(formData);
  if (!input.title) return { status: "error", message: "عنوان کتاب الزامی است." };
  if (!input.internalCode) return { status: "error", message: "کد داخلی الزامی است." };
  if (input.listPriceRials <= 0) {
    return { status: "error", message: "قیمت فهرست باید بزرگ‌تر از صفر باشد." };
  }

  let priceChanged = false;
  try {
    const result = await updateBookSku({
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      skuId,
      input,
    });
    priceChanged = result.priceChanged;
  } catch (error) {
    if (error instanceof BookCatalogError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  await prisma.auditLog.create({
    data: {
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      action: priceChanged
        ? AuditAction.BOOKS_CATALOG_PRICE_CHANGED
        : AuditAction.BOOKS_CATALOG_SKU_UPDATED,
      entityType: "BookSku",
      entityId: skuId,
      metadata: { internalCode: input.internalCode, priceChanged },
    },
  });

  revalidatePath("/admin/books/catalog");
  revalidatePath(`/admin/books/catalog/${skuId}`);
  redirect(`/admin/books/catalog/${skuId}`);
}
