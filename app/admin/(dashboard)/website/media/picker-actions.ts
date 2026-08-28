"use server";

import type {
  MediaPickerCategoriesResult,
  MediaPickerItem,
  MediaPickerSearchInput,
  MediaPickerSearchResult,
} from "@/components/admin/media/media-picker-types";
import { getAdminSession } from "@/lib/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import {
  listAdminMediaAssets,
  listAdminMediaCategories,
  type AdminMediaListItem,
} from "@/lib/website/media-library-admin";

function toPickerItem(row: AdminMediaListItem): MediaPickerItem {
  return {
    id: row.id,
    title: row.title,
    altText: row.altText,
    category: row.category,
    url: row.url,
    width: row.width,
    height: row.height,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    status: row.status,
  };
}

async function requireWebsiteManageSession() {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, "website.manage")) {
    return null;
  }
  return session;
}

export async function searchMediaLibraryAction(
  input: MediaPickerSearchInput = {},
): Promise<MediaPickerSearchResult> {
  const session = await requireWebsiteManageSession();
  if (!session) {
    return { ok: false, error: "دسترسی به کتابخانه رسانه مجاز نیست." };
  }

  try {
    const status = input.status ?? "ACTIVE";
    const imagesOnly = input.imagesOnly ?? true;

    const result = await listAdminMediaAssets(session.organization.id, {
      q: input.q,
      category: input.category,
      page: input.page,
      sort: input.sort ?? "newest",
      status,
      imagesOnly,
    });

    return {
      ok: true,
      data: {
        items: result.items.map(toPickerItem),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    };
  } catch {
    return {
      ok: false,
      error: "بارگذاری کتابخانه رسانه ناموفق بود. دوباره تلاش کنید.",
    };
  }
}

export async function listMediaPickerCategoriesAction(): Promise<MediaPickerCategoriesResult> {
  const session = await requireWebsiteManageSession();
  if (!session) {
    return { ok: false, error: "دسترسی به کتابخانه رسانه مجاز نیست." };
  }

  try {
    const categories = await listAdminMediaCategories(session.organization.id);
    return { ok: true, categories };
  } catch {
    return {
      ok: false,
      error: "بارگذاری دسته‌ها ناموفق بود.",
    };
  }
}
