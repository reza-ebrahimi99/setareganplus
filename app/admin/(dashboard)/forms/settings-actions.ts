"use server";

import { revalidatePath } from "next/cache";
import { FormVersionStatus } from "@/generated/prisma/enums";
import { getAdminSession } from "@/lib/auth/require-admin";
import { CAPACITY_MAX } from "@/lib/forms/capacity";
import {
  serializeFormVersionSettings,
} from "@/lib/forms/form-version-settings";
import { parseTehranDateTimeLocal } from "@/lib/forms/tehran-datetime";
import { prisma } from "@/lib/prisma";

export type FormSettingsActionState = {
  formError?: string;
  fieldErrors?: {
    opensAt?: string;
    registrationDeadline?: string;
    capacity?: string;
  };
  successMessage?: string;
  values?: {
    opensAt: string;
    registrationDeadline: string;
    capacity: string;
    showRemainingCapacity: boolean;
  };
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function updateDraftFormSettingsAction(
  _prev: FormSettingsActionState,
  formData: FormData,
): Promise<FormSettingsActionState> {
  const session = await getAdminSession();
  if (!session) {
    return { formError: "نشست مدیریت معتبر نیست. دوباره وارد شوید." };
  }

  const formId = readString(formData, "formId").trim();
  const opensAtRaw = readString(formData, "opensAt").trim();
  const deadlineRaw = readString(formData, "registrationDeadline").trim();
  const capacityRaw = readString(formData, "capacity").trim();
  const showRemainingCapacity =
    formData.get("showRemainingCapacity") === "on" ||
    formData.get("showRemainingCapacity") === "true" ||
    formData.get("showRemainingCapacity") === "yes";

  const values = {
    opensAt: opensAtRaw,
    registrationDeadline: deadlineRaw,
    capacity: capacityRaw,
    showRemainingCapacity,
  };

  if (!formId) {
    return { formError: "شناسه فرم نامعتبر است.", values };
  }

  const fieldErrors: NonNullable<FormSettingsActionState["fieldErrors"]> = {};

  let opensAt: Date | null = null;
  if (opensAtRaw) {
    opensAt = parseTehranDateTimeLocal(opensAtRaw);
    if (!opensAt) {
      fieldErrors.opensAt = "تاریخ و ساعت شروع ثبت‌نام معتبر نیست.";
    }
  }

  let registrationDeadline: Date | null = null;
  if (deadlineRaw) {
    registrationDeadline = parseTehranDateTimeLocal(deadlineRaw);
    if (!registrationDeadline) {
      fieldErrors.registrationDeadline =
        "تاریخ و ساعت پایان ثبت‌نام معتبر نیست.";
    }
  }

  let capacity: number | null = null;
  if (capacityRaw) {
    const parsed = Number(capacityRaw.replace(/[^\d]/g, ""));
    if (
      !Number.isInteger(parsed) ||
      parsed < 1 ||
      parsed > CAPACITY_MAX
    ) {
      fieldErrors.capacity = `ظرفیت باید عدد صحیح بین ۱ تا ${CAPACITY_MAX.toLocaleString("en-US")} باشد.`;
    } else {
      capacity = parsed;
    }
  }

  if (
    opensAt &&
    registrationDeadline &&
    opensAt.getTime() >= registrationDeadline.getTime()
  ) {
    fieldErrors.opensAt =
      fieldErrors.opensAt ?? "زمان شروع باید قبل از زمان پایان باشد.";
    fieldErrors.registrationDeadline =
      fieldErrors.registrationDeadline ??
      "زمان پایان باید بعد از زمان شروع باشد.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      formError: "لطفاً خطاهای تنظیمات را بررسی کنید.",
      fieldErrors,
      values,
    };
  }

  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: { id: true, slug: true },
  });

  if (!form) {
    return { formError: "فرم مورد نظر یافت نشد.", values };
  }

  const draft = await prisma.formVersion.findFirst({
    where: {
      organizationId: session.organization.id,
      formId: form.id,
      status: FormVersionStatus.DRAFT,
    },
    orderBy: { versionNumber: "desc" },
    select: { id: true },
  });

  if (!draft) {
    return {
      formError:
        "نسخه پیش‌نویس برای ویرایش تنظیمات وجود ندارد. نسخه منتشرشده از این‌جا تغییر نمی‌کند.",
      values,
    };
  }

  try {
    await prisma.formVersion.update({
      where: { id: draft.id },
      data: {
        opensAt,
        registrationDeadline,
        capacity,
        settings: serializeFormVersionSettings({
          showRemainingCapacity,
        }),
      },
    });
  } catch {
    return {
      formError: "ذخیره تنظیمات انجام نشد. دوباره تلاش کنید.",
      values,
    };
  }

  revalidatePath(`/admin/forms/${form.id}`);
  revalidatePath(`/forms/${form.slug}`);

  return {
    successMessage: "تنظیمات ثبت‌نام ذخیره شد.",
    values,
  };
}
