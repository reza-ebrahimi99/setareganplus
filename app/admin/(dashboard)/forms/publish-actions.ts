"use server";

import { revalidatePath } from "next/cache";
import { FormVersionStatus } from "@/generated/prisma/enums";
import { getAdminSession } from "@/lib/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import {
  publishFormDraft,
  type PublishFormDraftResult,
} from "@/lib/forms/publish-form-version";
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

export async function publishFormVersionAction(
  _prevState: PublishActionState,
  formData: FormData,
): Promise<PublishActionState> {
  const formId = readString(formData, "formId").trim();
  const expectedDraftVersionId = readString(
    formData,
    "draftVersionId",
  ).trim();
  if (!formId || !expectedDraftVersionId) {
    return { formError: "شناسه فرم یا نسخه پیش‌نویس نامعتبر است." };
  }

  const session = await getAdminSession();
  if (!session || !hasPermission(session, "forms.manage")) {
    return { formError: "نشست مدیریت معتبر نیست. دوباره وارد شوید." };
  }
  const organization = session.organization;

  let result: PublishFormDraftResult;
  try {
    result = await publishFormDraft({
      organizationId: organization.id,
      formId,
      expectedDraftVersionId,
      actorUserId: session.user.id,
    });
  } catch {
    return {
      formError: "انتشار فرم با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
    };
  }

  if (!result.ok) {
    if (result.reason === "form_not_found") {
      return { formError: "فرم مورد نظر یافت نشد." };
    }
    if (result.reason === "draft_not_found") {
      return {
        formError:
          "نسخه پیش‌نویس برای انتشار یافت نشد. فقط نسخه‌های پیش‌نویس قابل انتشار هستند.",
      };
    }
    if (result.reason === "validation_failed") {
      return {
        formError: "انتشار فرم به دلیل خطاهای اعتبارسنجی انجام نشد.",
        errors: result.errors,
      };
    }
    return {
      formError:
        "فرم هم‌زمان در حال انتشار یا ویرایش بود. صفحه را تازه‌سازی و دوباره تلاش کنید.",
    };
  }

  revalidateFormRoutes(result.formId);
  revalidatePath(`/forms/${result.slug}`);
  return {
    successMessage:
      "تغییرات منتشر شد و یک پیش‌نویس تازه برای ویرایش‌های بعدی ساخته شد.",
  };
}

export async function pausePublishedFormAction(
  _prevState: PublishActionState,
  formData: FormData,
): Promise<PublishActionState> {
  const formId = readString(formData, "formId").trim();
  if (!formId) {
    return { formError: "شناسه فرم نامعتبر است." };
  }

  const session = await getAdminSession();
  if (!session || !hasPermission(session, "forms.manage")) {
    return { formError: "نشست مدیریت معتبر نیست. دوباره وارد شوید." };
  }
  const organization = session.organization;

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
