"use server";

import { revalidatePath } from "next/cache";
import {
  AuditAction,
  FormVersionStatus,
  SitePlacementContentType,
  SitePlacementDisplayMode,
  SitePlacementKey,
} from "@/generated/prisma/enums";
import { getAdminSession } from "@/lib/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import {
  PLACEMENT_TEXT_LIMITS,
  SITE_PLACEMENT_REGISTRY,
  displayModesForContent,
  isSiteDisplayMode,
  isSitePlacementKey,
  type SitePlacementKeyValue,
} from "@/lib/site/placement-registry";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type PlacementActionState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
  successMessage?: string;
  placementKey?: string;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readCheckbox(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "yes";
}

function revalidatePlacementPaths(placementKey: SitePlacementKeyValue) {
  const target = SITE_PLACEMENT_REGISTRY[placementKey].targetPath;
  revalidatePath(target);
  revalidatePath("/admin/settings/site-placements");
}

async function writeAudit(params: {
  organizationId: string;
  actorUserId: string;
  entityId: string;
  metadata: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        action: AuditAction.SITE_PLACEMENT_UPDATED,
        entityType: "SitePlacement",
        entityId: params.entityId,
        metadata: params.metadata,
      },
    });
  } catch {
    // Audit must not block placement saves.
  }
}

export async function upsertSitePlacementAction(
  _prev: PlacementActionState,
  formData: FormData,
): Promise<PlacementActionState> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, "settings.manage")) {
    return { formError: "نشست مدیریت معتبر نیست. دوباره وارد شوید." };
  }

  const placementKeyRaw = readString(formData, "placementKey").trim();
  if (!isSitePlacementKey(placementKeyRaw)) {
    return { formError: "جایگاه انتخاب‌شده پشتیبانی نمی‌شود." };
  }
  const placementKey = placementKeyRaw;
  const registry = SITE_PLACEMENT_REGISTRY[placementKey];

  const isEnabled = readCheckbox(formData, "isEnabled");
  const formId = readString(formData, "formId").trim() || null;
  const bookingServiceId =
    readString(formData, "bookingServiceId").trim() || null;
  const displayModeRaw = readString(formData, "displayMode").trim();
  const showPoster = readCheckbox(formData, "showPoster");
  const heading = readString(formData, "heading").trim();
  const description = readString(formData, "description").trim();
  const ctaLabel = readString(formData, "ctaLabel").trim();

  const fieldErrors: Record<string, string> = {};

  if (heading.length > PLACEMENT_TEXT_LIMITS.heading) {
    fieldErrors.heading = `عنوان نباید بیشتر از ${PLACEMENT_TEXT_LIMITS.heading} کاراکتر باشد.`;
  }
  if (description.length > PLACEMENT_TEXT_LIMITS.description) {
    fieldErrors.description = `توضیح نباید بیشتر از ${PLACEMENT_TEXT_LIMITS.description} کاراکتر باشد.`;
  }
  if (ctaLabel.length > PLACEMENT_TEXT_LIMITS.ctaLabel) {
    fieldErrors.ctaLabel = `متن دکمه نباید بیشتر از ${PLACEMENT_TEXT_LIMITS.ctaLabel} کاراکتر باشد.`;
  }

  const allowed = registry.allowedContentTypes[0];
  let contentType: SitePlacementContentType = SitePlacementContentType.NONE;
  let resolvedFormId: string | null = null;
  let resolvedBookingId: string | null = null;

  if (isEnabled) {
    if (allowed === "FORM") {
      contentType = SitePlacementContentType.FORM;
      if (!formId) {
        fieldErrors.formId = "یک فرم منتشرشده انتخاب کنید.";
      } else {
        const form = await prisma.form.findFirst({
          where: {
            id: formId,
            organizationId: session.organization.id,
            deletedAt: null,
            publishedVersionId: { not: null },
            publishedVersion: { status: FormVersionStatus.PUBLISHED },
          },
          select: { id: true },
        });
        if (!form) {
          fieldErrors.formId =
            "فرم انتخاب‌شده معتبر نیست، متعلق به سازمان دیگری است، یا منتشر نشده است.";
        } else {
          resolvedFormId = form.id;
        }
      }
      if (bookingServiceId) {
        fieldErrors.bookingServiceId =
          "برای این جایگاه فقط فرم مجاز است.";
      }
    } else {
      contentType = SitePlacementContentType.BOOKING;
      if (!bookingServiceId) {
        fieldErrors.bookingServiceId = "یک خدمت نوبت‌دهی فعال انتخاب کنید.";
      } else {
        const service = await prisma.bookingService.findFirst({
          where: {
            id: bookingServiceId,
            organizationId: session.organization.id,
            deletedAt: null,
            isActive: true,
          },
          select: { id: true },
        });
        if (!service) {
          fieldErrors.bookingServiceId =
            "خدمت انتخاب‌شده معتبر نیست، متعلق به سازمان دیگری است، یا غیرفعال است.";
        } else {
          resolvedBookingId = service.id;
        }
      }
      if (formId) {
        fieldErrors.formId = "برای این جایگاه فقط رزرو نوبت مجاز است.";
      }
    }
  }

  let displayMode: SitePlacementDisplayMode =
    SitePlacementDisplayMode[registry.defaultDisplayMode];
  if (!isSiteDisplayMode(displayModeRaw)) {
    fieldErrors.displayMode = "حالت نمایش نامعتبر است.";
  } else if (
    isEnabled &&
    allowed &&
    !displayModesForContent(allowed).includes(displayModeRaw)
  ) {
    fieldErrors.displayMode = "حالت نمایش با نوع محتوا سازگار نیست.";
  } else if (isSiteDisplayMode(displayModeRaw)) {
    displayMode = SitePlacementDisplayMode[displayModeRaw];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      formError: "لطفاً خطاهای فرم را برطرف کنید.",
      placementKey,
    };
  }

  try {
    const saved = await prisma.sitePlacement.upsert({
      where: {
        organizationId_placementKey: {
          organizationId: session.organization.id,
          placementKey: placementKey as SitePlacementKey,
        },
      },
      create: {
        organizationId: session.organization.id,
        placementKey: placementKey as SitePlacementKey,
        contentType,
        formId: resolvedFormId,
        bookingServiceId: resolvedBookingId,
        displayMode,
        showPoster: registry.supportsShowPoster ? showPoster : false,
        isEnabled,
        heading: heading || null,
        description: description || null,
        ctaLabel: registry.supportsCtaLabel ? ctaLabel || null : null,
        deletedAt: null,
      },
      update: {
        contentType,
        formId: resolvedFormId,
        bookingServiceId: resolvedBookingId,
        displayMode,
        showPoster: registry.supportsShowPoster ? showPoster : false,
        isEnabled,
        heading: heading || null,
        description: description || null,
        ctaLabel: registry.supportsCtaLabel ? ctaLabel || null : null,
        deletedAt: null,
      },
      select: { id: true },
    });

    await writeAudit({
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      entityId: saved.id,
      metadata: {
        placementKey,
        isEnabled,
        contentType,
        formId: resolvedFormId,
        bookingServiceId: resolvedBookingId,
      },
    });
  } catch {
    return {
      formError: "ذخیره جایگاه با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
      placementKey,
    };
  }

  revalidatePlacementPaths(placementKey);
  return {
    successMessage: "جایگاه با موفقیت ذخیره شد.",
    placementKey,
  };
}

export async function disableSitePlacementAction(
  _prev: PlacementActionState,
  formData: FormData,
): Promise<PlacementActionState> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, "settings.manage")) {
    return { formError: "نشست مدیریت معتبر نیست. دوباره وارد شوید." };
  }

  const placementKeyRaw = readString(formData, "placementKey").trim();
  if (!isSitePlacementKey(placementKeyRaw)) {
    return { formError: "جایگاه انتخاب‌شده پشتیبانی نمی‌شود." };
  }

  try {
    const saved = await prisma.sitePlacement.upsert({
      where: {
        organizationId_placementKey: {
          organizationId: session.organization.id,
          placementKey: placementKeyRaw as SitePlacementKey,
        },
      },
      create: {
        organizationId: session.organization.id,
        placementKey: placementKeyRaw as SitePlacementKey,
        contentType: SitePlacementContentType.NONE,
        isEnabled: false,
        displayMode:
          SitePlacementDisplayMode[
            SITE_PLACEMENT_REGISTRY[placementKeyRaw].defaultDisplayMode
          ],
      },
      update: {
        isEnabled: false,
        deletedAt: null,
      },
      select: { id: true },
    });

    await writeAudit({
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      entityId: saved.id,
      metadata: { placementKey: placementKeyRaw, action: "disable" },
    });
  } catch {
    return {
      formError: "غیرفعال‌سازی جایگاه با خطا مواجه شد.",
      placementKey: placementKeyRaw,
    };
  }

  revalidatePlacementPaths(placementKeyRaw);
  return {
    successMessage: "جایگاه غیرفعال شد (پشتیبان سرور نیز اعمال نمی‌شود).",
    placementKey: placementKeyRaw,
  };
}

/**
 * Soft-delete / clear DB placement so transitional env fallback resumes.
 */
export async function resetSitePlacementAction(
  _prev: PlacementActionState,
  formData: FormData,
): Promise<PlacementActionState> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, "settings.manage")) {
    return { formError: "نشست مدیریت معتبر نیست. دوباره وارد شوید." };
  }

  const placementKeyRaw = readString(formData, "placementKey").trim();
  if (!isSitePlacementKey(placementKeyRaw)) {
    return { formError: "جایگاه انتخاب‌شده پشتیبانی نمی‌شود." };
  }

  try {
    const existing = await prisma.sitePlacement.findFirst({
      where: {
        organizationId: session.organization.id,
        placementKey: placementKeyRaw as SitePlacementKey,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.sitePlacement.update({
        where: {
          organizationId_id: {
            organizationId: session.organization.id,
            id: existing.id,
          },
        },
        data: {
          deletedAt: new Date(),
          isEnabled: false,
          contentType: SitePlacementContentType.NONE,
          formId: null,
          bookingServiceId: null,
        },
      });
      await writeAudit({
        organizationId: session.organization.id,
        actorUserId: session.user.id,
        entityId: existing.id,
        metadata: { placementKey: placementKeyRaw, action: "reset" },
      });
    }
  } catch {
    return {
      formError: "بازنشانی جایگاه با خطا مواجه شد.",
      placementKey: placementKeyRaw,
    };
  }

  revalidatePlacementPaths(placementKeyRaw);
  return {
    successMessage:
      "جایگاه به حالت پشتیبان سرور بازگردانده شد (در صورت تنظیم بودن).",
    placementKey: placementKeyRaw,
  };
}
