"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import {
  TOP_RANK_ARCHIVE_ADMIN_PATH,
  TOP_RANK_ARCHIVE_PUBLIC_PATH,
} from "@/lib/website/top-rank-archive-constants";
import {
  findLiveTopRankByYear,
  nextTopRankSortOrder,
  parseTopRankWriteInput,
} from "@/lib/website/top-rank-archive-admin";

export type TopRankArchiveActionState = {
  formError?: string;
  successMessage?: string;
  fieldErrors?: Record<string, string>;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateTopRankPaths() {
  revalidatePath(TOP_RANK_ARCHIVE_ADMIN_PATH);
  revalidatePath(TOP_RANK_ARCHIVE_PUBLIC_PATH);
  revalidatePath("/achievements");
}

async function assertOrgMedia(
  organizationId: string,
  mediaId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const media = await prisma.mediaAsset.findFirst({
    where: { id: mediaId, organizationId, deletedAt: null, status: "ACTIVE" },
    select: { id: true },
  });
  if (!media) {
    return { ok: false, error: "تصویر انتخاب‌شده در این سازمان یافت نشد." };
  }
  return { ok: true };
}

function isUniqueYearConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createTopRankArchiveAction(
  _prev: TopRankArchiveActionState,
  formData: FormData,
): Promise<TopRankArchiveActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;

  const parsed = parseTopRankWriteInput({
    yearRaw: readString(formData, "year"),
    titleRaw: readString(formData, "title"),
    descriptionRaw: readString(formData, "description"),
    mediaIdRaw: readString(formData, "mediaId"),
    sortOrderRaw: readString(formData, "sortOrder"),
    isPublished: readString(formData, "isPublished") === "true",
  });
  if (!parsed.ok) {
    return {
      formError: parsed.formError,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const mediaCheck = await assertOrgMedia(organizationId, parsed.data.mediaId);
  if (!mediaCheck.ok) {
    return {
      formError: mediaCheck.error,
      fieldErrors: { mediaId: mediaCheck.error },
    };
  }

  const duplicate = await findLiveTopRankByYear(
    organizationId,
    parsed.data.year,
  );
  if (duplicate) {
    return {
      formError: "برای این سال قبلاً رکوردی ثبت شده است.",
      fieldErrors: { year: "سال تکراری است." },
    };
  }

  const sortOrder =
    readString(formData, "sortOrder").trim() === ""
      ? await nextTopRankSortOrder(organizationId)
      : parsed.data.sortOrder;

  try {
    await prisma.websiteTopRankArchive.create({
      data: {
        organizationId,
        year: parsed.data.year,
        title: parsed.data.title,
        description: parsed.data.description,
        mediaId: parsed.data.mediaId,
        sortOrder,
        isPublished: parsed.data.isPublished,
      },
    });
  } catch (error) {
    if (isUniqueYearConflict(error)) {
      return {
        formError: "برای این سال قبلاً رکوردی ثبت شده است.",
        fieldErrors: { year: "سال تکراری است." },
      };
    }
    console.error("[top-rank-archive] create failed", error);
    return { formError: "ایجاد رکورد با خطا مواجه شد." };
  }

  revalidateTopRankPaths();
  redirect(TOP_RANK_ARCHIVE_ADMIN_PATH);
}

export async function updateTopRankArchiveAction(
  _prev: TopRankArchiveActionState,
  formData: FormData,
): Promise<TopRankArchiveActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const id = readString(formData, "archiveId").trim();
  if (!id) {
    return { formError: "شناسه رکورد نامعتبر است." };
  }

  const existing = await prisma.websiteTopRankArchive.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return { formError: "رکورد یافت نشد." };
  }

  const parsed = parseTopRankWriteInput({
    yearRaw: readString(formData, "year"),
    titleRaw: readString(formData, "title"),
    descriptionRaw: readString(formData, "description"),
    mediaIdRaw: readString(formData, "mediaId"),
    sortOrderRaw: readString(formData, "sortOrder"),
    isPublished: readString(formData, "isPublished") === "true",
  });
  if (!parsed.ok) {
    return {
      formError: parsed.formError,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const mediaCheck = await assertOrgMedia(organizationId, parsed.data.mediaId);
  if (!mediaCheck.ok) {
    return {
      formError: mediaCheck.error,
      fieldErrors: { mediaId: mediaCheck.error },
    };
  }

  const duplicate = await findLiveTopRankByYear(
    organizationId,
    parsed.data.year,
    id,
  );
  if (duplicate) {
    return {
      formError: "برای این سال قبلاً رکوردی ثبت شده است.",
      fieldErrors: { year: "سال تکراری است." },
    };
  }

  try {
    await prisma.websiteTopRankArchive.update({
      where: { id },
      data: {
        year: parsed.data.year,
        title: parsed.data.title,
        description: parsed.data.description,
        mediaId: parsed.data.mediaId,
        sortOrder: parsed.data.sortOrder,
        isPublished: parsed.data.isPublished,
      },
    });
  } catch (error) {
    if (isUniqueYearConflict(error)) {
      return {
        formError: "برای این سال قبلاً رکوردی ثبت شده است.",
        fieldErrors: { year: "سال تکراری است." },
      };
    }
    console.error("[top-rank-archive] update failed", error);
    return { formError: "ذخیره تغییرات با خطا مواجه شد." };
  }

  revalidateTopRankPaths();
  return { successMessage: "تغییرات ذخیره شد." };
}

export async function deleteTopRankArchiveAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const id = readString(formData, "archiveId").trim();
  if (!id) return;

  await prisma.websiteTopRankArchive.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: {
      deletedAt: new Date(),
      isPublished: false,
    },
  });

  revalidateTopRankPaths();
  redirect(TOP_RANK_ARCHIVE_ADMIN_PATH);
}

export async function setTopRankArchivePublishedAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const id = readString(formData, "archiveId").trim();
  const isPublished = readString(formData, "isPublished") === "true";
  if (!id) return;

  await prisma.websiteTopRankArchive.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { isPublished },
  });

  revalidateTopRankPaths();
}
