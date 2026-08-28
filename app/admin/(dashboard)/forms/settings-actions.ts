"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { FormVersionStatus } from "@/generated/prisma/enums";
import { getAdminSession } from "@/lib/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import { CAPACITY_MAX } from "@/lib/forms/capacity";
import {
  serializeFormVersionSettings,
} from "@/lib/forms/form-version-settings";
import {
  mergeFormSettingsWithBooking,
  type FormBookingSettings,
} from "@/lib/booking/form-booking-settings";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { parseTehranDateTimeLocal } from "@/lib/forms/tehran-datetime";
import { prisma } from "@/lib/prisma";

export type FormSettingsActionState = {
  formError?: string;
  fieldErrors?: {
    opensAt?: string;
    registrationDeadline?: string;
    capacity?: string;
    adminSmsRecipients?: string;
    smsTemplateCode?: string;
  };
  successMessage?: string;
  values?: {
    opensAt: string;
    registrationDeadline: string;
    capacity: string;
    showRemainingCapacity: boolean;
    confirmationSmsEnabled: boolean;
    adminNotificationSmsEnabled: boolean;
    adminSmsRecipients: string;
    smsTemplateCode: string;
  };
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readCheckbox(formData: FormData, key: string): boolean {
  return (
    formData.get(key) === "on" ||
    formData.get(key) === "true" ||
    formData.get(key) === "yes"
  );
}

export async function updateDraftFormSettingsAction(
  _prev: FormSettingsActionState,
  formData: FormData,
): Promise<FormSettingsActionState> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, "forms.manage")) {
    return { formError: "نشست مدیریت معتبر نیست. دوباره وارد شوید." };
  }

  const formId = readString(formData, "formId").trim();
  const opensAtRaw = readString(formData, "opensAt").trim();
  const deadlineRaw = readString(formData, "registrationDeadline").trim();
  const capacityRaw = readString(formData, "capacity").trim();
  const showRemainingCapacity = readCheckbox(formData, "showRemainingCapacity");
  const confirmationSmsEnabled = readCheckbox(
    formData,
    "confirmationSmsEnabled",
  );
  const adminNotificationSmsEnabled = readCheckbox(
    formData,
    "adminNotificationSmsEnabled",
  );
  const adminSmsRecipientsRaw = readString(formData, "adminSmsRecipients");
  const smsTemplateCode = readString(formData, "smsTemplateCode").trim();

  const values = {
    opensAt: opensAtRaw,
    registrationDeadline: deadlineRaw,
    capacity: capacityRaw,
    showRemainingCapacity,
    confirmationSmsEnabled,
    adminNotificationSmsEnabled,
    adminSmsRecipients: adminSmsRecipientsRaw,
    smsTemplateCode,
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

  const recipientsRaw = adminSmsRecipientsRaw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const adminSmsRecipients: string[] = [];
  for (const recipient of recipientsRaw) {
    const normalized = normalizeIranianMobile(recipient);
    if (!normalized.ok) {
      fieldErrors.adminSmsRecipients =
        "یکی از شماره‌های مدیر نامعتبر است.";
      break;
    }
    if (!adminSmsRecipients.includes(normalized.normalized)) {
      adminSmsRecipients.push(normalized.normalized);
    }
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
    select: { id: true, settings: true },
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
        settings: {
          ...(draft.settings as Record<string, unknown>),
          ...serializeFormVersionSettings({
            showRemainingCapacity,
            confirmationSmsEnabled,
            adminNotificationSmsEnabled,
            adminSmsRecipients,
            smsTemplateCode: smsTemplateCode || null,
          }),
        } as Prisma.InputJsonValue,
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

export async function updateDraftFormBookingAction(
  _prev: { error?: string; success?: string },
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, "forms.manage")) return { error: "اجازه انجام این عملیات را ندارید." };
  const formId = readString(formData, "formId").trim();
  const serviceId = readString(formData, "serviceId").trim() || null;
  const requireTiming = readString(formData, "requireTiming");
  if (!formId || !["before_submit", "after_submit", "optional"].includes(requireTiming)) {
    return { error: "تنظیمات اتصال نوبت‌دهی معتبر نیست." };
  }
  const enabled = formData.get("enabled") === "on";
  if (enabled && !serviceId) return { error: "برای فعال‌سازی، یک خدمت انتخاب کنید." };
  if (serviceId) {
    const service = await prisma.bookingService.findFirst({
      where: { id: serviceId, organizationId: session.organization.id, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (!service) return { error: "خدمت انتخاب‌شده معتبر نیست." };
  }
  const draft = await prisma.formVersion.findFirst({
    where: { organizationId: session.organization.id, formId, status: FormVersionStatus.DRAFT },
    orderBy: { versionNumber: "desc" },
    select: { id: true, settings: true },
  });
  if (!draft) return { error: "نسخه پیش‌نویس قابل ویرایش یافت نشد." };
  const booking: FormBookingSettings = {
    enabled, serviceId, requireTiming: requireTiming as FormBookingSettings["requireTiming"],
    allowWaitingList: formData.get("allowWaitingList") === "on",
    allowAdvisorSelection: formData.get("allowAdvisorSelection") === "on",
    allowBranchSelection: formData.get("allowBranchSelection") === "on",
    showRemainingCapacity: formData.get("showRemainingCapacity") === "on",
  };
  await prisma.formVersion.update({
    where: { id: draft.id },
    data: {
      settings: mergeFormSettingsWithBooking(
        draft.settings,
        booking,
      ) as Prisma.InputJsonValue,
    },
  });
  revalidatePath(`/admin/forms/${formId}`);
  return { success: "اتصال فرم به نوبت‌دهی ذخیره شد." };
}
