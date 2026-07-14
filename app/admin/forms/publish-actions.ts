"use server";

import { revalidatePath } from "next/cache";
import { FormVersionStatus } from "@/generated/prisma/enums";
import { validateFormVersionForPublish } from "@/lib/forms/validate-form-for-publish";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";

export type PublishActionState = {
  formError?: string;
  errors?: string[];
  successMessage?: string;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateFormRoutes(formId: string) {
  revalidatePath("/admin/forms");
  revalidatePath(`/admin/forms/${formId}`);
}

/**
 * Application-level invariant (DB does not yet enforce a partial unique index):
 * At most one FormVersion with status PUBLISHED per form, and
 * Form.publishedVersionId must point only to that PUBLISHED version (or null).
 * Enforced transactionally here — do not add a migration in 3.4B-2.5.
 */

export async function publishFormVersionAction(
  _prevState: PublishActionState,
  formData: FormData,
): Promise<PublishActionState> {
  // TODO(auth): Enforce authenticated admin session + organization membership.

  const formId = readString(formData, "formId").trim();
  if (!formId) {
    return { formError: "شناسه فرم نامعتبر است." };
  }

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    return {
      formError:
        "سازمان پیش‌فرض یافت نشد. ابتدا پایگاه داده را پیکربندی و seed کنید.",
    };
  }

  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      organizationId: organization.id,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      publishedVersionId: true,
    },
  });

  if (!form) {
    return { formError: "فرم مورد نظر یافت نشد." };
  }

  const draft = await prisma.formVersion.findFirst({
    where: {
      organizationId: organization.id,
      formId: form.id,
      status: FormVersionStatus.DRAFT,
    },
    orderBy: { versionNumber: "desc" },
    select: {
      id: true,
      title: true,
      confirmationMessage: true,
      status: true,
      fields: {
        orderBy: { sortOrder: "asc" },
        select: {
          fieldKey: true,
          sortOrder: true,
          type: true,
          label: true,
          required: true,
          config: true,
        },
      },
    },
  });

  if (!draft || draft.status !== FormVersionStatus.DRAFT) {
    return {
      formError:
        "نسخه پیش‌نویس برای انتشار یافت نشد. فقط نسخه‌های پیش‌نویس قابل انتشار هستند.",
    };
  }

  const validation = validateFormVersionForPublish({
    slug: form.slug,
    title: draft.title,
    confirmationMessage: draft.confirmationMessage,
    fields: draft.fields,
  });

  if (!validation.ok) {
    return {
      formError: "انتشار فرم به دلیل خطاهای اعتبارسنجی انجام نشد.",
      errors: validation.errors,
    };
  }

  const publishedAt = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      // Capture every currently PUBLISHED version for this form (invariant safety).
      const currentlyPublished = await tx.formVersion.findMany({
        where: {
          organizationId: organization.id,
          formId: form.id,
          status: FormVersionStatus.PUBLISHED,
          NOT: { id: draft.id },
        },
        select: { id: true },
      });

      await tx.formVersion.update({
        where: {
          organizationId_id: {
            organizationId: organization.id,
            id: draft.id,
          },
        },
        data: {
          status: FormVersionStatus.PUBLISHED,
          publishedAt,
        },
      });

      // Point the public pointer at the newly published version before superseding others.
      await tx.form.update({
        where: {
          organizationId_id: {
            organizationId: organization.id,
            id: form.id,
          },
        },
        data: {
          publishedVersionId: draft.id,
        },
      });

      if (currentlyPublished.length > 0) {
        await tx.formVersion.updateMany({
          where: {
            organizationId: organization.id,
            formId: form.id,
            id: { in: currentlyPublished.map((version) => version.id) },
            status: FormVersionStatus.PUBLISHED,
          },
          data: {
            status: FormVersionStatus.SUPERSEDED,
          },
        });
      }
    });
  } catch {
    return {
      formError: "انتشار فرم با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
    };
  }

  revalidateFormRoutes(form.id);
  return { successMessage: "فرم با موفقیت منتشر شد." };
}

export async function pausePublishedFormAction(
  _prevState: PublishActionState,
  formData: FormData,
): Promise<PublishActionState> {
  // TODO(auth): Enforce authenticated admin session + organization membership.

  const formId = readString(formData, "formId").trim();
  if (!formId) {
    return { formError: "شناسه فرم نامعتبر است." };
  }

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    return {
      formError:
        "سازمان پیش‌فرض یافت نشد. ابتدا پایگاه داده را پیکربندی و seed کنید.",
    };
  }

  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      organizationId: organization.id,
      deletedAt: null,
    },
    select: {
      id: true,
      publishedVersionId: true,
    },
  });

  if (!form) {
    return { formError: "فرم مورد نظر یافت نشد." };
  }

  if (!form.publishedVersionId) {
    return { formError: "این فرم نسخه منتشرشده‌ای ندارد." };
  }

  const publishedVersion = await prisma.formVersion.findFirst({
    where: {
      id: form.publishedVersionId,
      organizationId: organization.id,
      formId: form.id,
      status: FormVersionStatus.PUBLISHED,
    },
    select: { id: true },
  });

  if (!publishedVersion) {
    return {
      formError:
        "نسخه منتشرشده معتبر یافت نشد. وضعیت انتشار با داده‌های ذخیره‌شده هم‌خوان نیست.",
    };
  }

  const pausedAt = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      // Clear public pointer first so PAUSED versions never remain linked.
      await tx.form.update({
        where: {
          organizationId_id: {
            organizationId: organization.id,
            id: form.id,
          },
        },
        data: {
          publishedVersionId: null,
        },
      });

      await tx.formVersion.update({
        where: {
          organizationId_id: {
            organizationId: organization.id,
            id: publishedVersion.id,
          },
        },
        data: {
          status: FormVersionStatus.PAUSED,
          pausedAt,
        },
      });
    });
  } catch {
    return {
      formError: "توقف انتشار با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
    };
  }

  revalidateFormRoutes(form.id);
  return { successMessage: "انتشار فرم متوقف شد." };
}
