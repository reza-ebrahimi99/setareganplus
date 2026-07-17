"use server";

import { revalidatePath } from "next/cache";
import { FormVersionStatus } from "@/generated/prisma/enums";
import { getAdminSession } from "@/lib/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import {
  generateFormsStorageKey,
  publicUrlForStorageKey,
  writeMediaFile,
} from "@/lib/media/storage";
import { validatePosterFile } from "@/lib/media/validate-poster";
import { prisma } from "@/lib/prisma";

export type PosterActionState = {
  formError?: string;
  successMessage?: string;
  poster?: {
    publicUrl: string;
    altText: string | null;
  } | null;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateEditor(formId: string, slug?: string) {
  revalidatePath(`/admin/forms/${formId}`);
  if (slug) {
    revalidatePath(`/forms/${slug}`);
  }
}

async function loadDraftContext(formId: string, organizationId: string) {
  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      organizationId,
      deletedAt: null,
    },
    select: { id: true, slug: true },
  });

  if (!form) {
    return { error: "فرم مورد نظر یافت نشد." } as const;
  }

  const draft = await prisma.formVersion.findFirst({
    where: {
      organizationId,
      formId: form.id,
      status: FormVersionStatus.DRAFT,
    },
    orderBy: { versionNumber: "desc" },
    select: {
      id: true,
      posterMediaId: true,
    },
  });

  if (!draft) {
    return {
      error:
        "نسخه پیش‌نویس برای ویرایش پوستر وجود ندارد. نسخه منتشرشده از این‌جا تغییر نمی‌کند.",
    } as const;
  }

  return { form, draft } as const;
}

export async function uploadFormPosterAction(
  _prev: PosterActionState,
  formData: FormData,
): Promise<PosterActionState> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, "forms.manage")) {
    return { formError: "نشست مدیریت معتبر نیست. دوباره وارد شوید." };
  }

  const formId = readString(formData, "formId").trim();
  if (!formId) {
    return { formError: "شناسه فرم نامعتبر است." };
  }

  const altTextRaw = readString(formData, "altText").trim();
  const altText = altTextRaw.slice(0, 200) || null;
  const file = formData.get("poster");
  const validated = await validatePosterFile(
    file instanceof File ? file : null,
  );

  if (!validated.ok) {
    return { formError: validated.error };
  }

  const ctx = await loadDraftContext(formId, session.organization.id);
  if ("error" in ctx) {
    return { formError: ctx.error };
  }

  const storageKey = generateFormsStorageKey(validated.extension);

  let written;
  try {
    written = await writeMediaFile({
      storageKey,
      data: validated.buffer,
    });
  } catch {
    return {
      formError:
        "ذخیره‌سازی فایل انجام نشد. مسیر رسانه را روی سرور بررسی کنید.",
    };
  }

  const previousMediaId = ctx.draft.posterMediaId;

  try {
    const media = await prisma.$transaction(async (tx) => {
      const created = await tx.mediaAsset.create({
        data: {
          organizationId: session.organization.id,
          storageKey,
          originalName: validated.originalName,
          mimeType: validated.mimeType,
          byteSize: written.byteSize,
          checksum: written.checksum,
          altText,
          createdByUserId: session.user.id,
        },
        select: {
          id: true,
          storageKey: true,
          altText: true,
        },
      });

      await tx.formVersion.update({
        where: { id: ctx.draft.id },
        data: { posterMediaId: created.id },
      });

      if (previousMediaId && previousMediaId !== created.id) {
        const remainingReferences = await tx.formVersion.count({
          where: {
            organizationId: session.organization.id,
            posterMediaId: previousMediaId,
          },
        });
        if (remainingReferences === 0) {
          await tx.mediaAsset.updateMany({
            where: {
              id: previousMediaId,
              organizationId: session.organization.id,
              deletedAt: null,
            },
            data: { deletedAt: new Date() },
          });
        }
      }

      return created;
    });

    revalidateEditor(ctx.form.id, ctx.form.slug);

    return {
      successMessage: previousMediaId
        ? "پوستر با موفقیت جایگزین شد."
        : "پوستر با موفقیت بارگذاری شد.",
      poster: {
        publicUrl: publicUrlForStorageKey(media.storageKey),
        altText: media.altText,
      },
    };
  } catch {
    return {
      formError: "ثبت اطلاعات پوستر انجام نشد. دوباره تلاش کنید.",
    };
  }
}

export async function removeFormPosterAction(
  _prev: PosterActionState,
  formData: FormData,
): Promise<PosterActionState> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, "forms.manage")) {
    return { formError: "نشست مدیریت معتبر نیست. دوباره وارد شوید." };
  }

  const formId = readString(formData, "formId").trim();
  if (!formId) {
    return { formError: "شناسه فرم نامعتبر است." };
  }

  const ctx = await loadDraftContext(formId, session.organization.id);
  if ("error" in ctx) {
    return { formError: ctx.error };
  }

  if (!ctx.draft.posterMediaId) {
    return { successMessage: "پوستری برای حذف وجود ندارد.", poster: null };
  }

  const mediaId = ctx.draft.posterMediaId;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.formVersion.update({
        where: { id: ctx.draft.id },
        data: { posterMediaId: null },
      });

      const remainingReferences = await tx.formVersion.count({
        where: {
          organizationId: session.organization.id,
          posterMediaId: mediaId,
        },
      });
      if (remainingReferences === 0) {
        await tx.mediaAsset.updateMany({
          where: {
            id: mediaId,
            organizationId: session.organization.id,
            deletedAt: null,
          },
          data: { deletedAt: new Date() },
        });
      }
    });
  } catch {
    return { formError: "حذف پوستر انجام نشد. دوباره تلاش کنید." };
  }

  // Physical file retained after soft-delete (safe; cleanup job later).
  revalidateEditor(ctx.form.id, ctx.form.slug);

  return {
    successMessage: "پوستر از نسخه پیش‌نویس حذف شد.",
    poster: null,
  };
}
