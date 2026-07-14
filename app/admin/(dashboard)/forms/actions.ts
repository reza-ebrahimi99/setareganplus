"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { FormVersionStatus } from "@/generated/prisma/enums";
import { isFormPurpose } from "@/lib/forms/form-purpose-labels";
import { mapPrismaFormError } from "@/lib/forms/map-prisma-form-error";
import { normalizeFormSlug } from "@/lib/forms/normalize-form-slug";
import { getAdminSession } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export type CreateFormFieldErrors = {
  title?: string;
  slug?: string;
  purpose?: string;
  confirmationMessage?: string;
};

export type CreateFormValues = {
  title: string;
  slug: string;
  purpose: string;
  confirmationMessage: string;
};

export type CreateFormState = {
  fieldErrors?: CreateFormFieldErrors;
  formError?: string;
  values?: CreateFormValues;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createFormAction(
  _prevState: CreateFormState,
  formData: FormData,
): Promise<CreateFormState> {
  const session = await getAdminSession();
  if (!session) {
    return { formError: "نشست مدیریت معتبر نیست. دوباره وارد شوید." };
  }
  const organization = session.organization;

  const title = readString(formData, "title").trim();
  const rawSlug = readString(formData, "slug");
  const purposeRaw = readString(formData, "purpose").trim();
  const confirmationMessage = readString(
    formData,
    "confirmationMessage",
  ).trim();

  const values: CreateFormValues = {
    title,
    slug: rawSlug.trim().toLowerCase(),
    purpose: purposeRaw,
    confirmationMessage,
  };

  const fieldErrors: CreateFormFieldErrors = {};

  if (!title) {
    fieldErrors.title = "عنوان فرم الزامی است.";
  } else if (title.length > 200) {
    fieldErrors.title = "عنوان فرم نباید بیشتر از ۲۰۰ کاراکتر باشد.";
  }

  const slugResult = normalizeFormSlug(rawSlug);
  if (!slugResult.ok) {
    fieldErrors.slug = slugResult.error;
  }

  if (!purposeRaw) {
    fieldErrors.purpose = "هدف فرم را انتخاب کنید.";
  } else if (!isFormPurpose(purposeRaw)) {
    fieldErrors.purpose = "هدف فرم نامعتبر است.";
  }

  if (!confirmationMessage) {
    fieldErrors.confirmationMessage = "پیام تأیید پس از ثبت الزامی است.";
  } else if (confirmationMessage.length > 2000) {
    fieldErrors.confirmationMessage =
      "پیام تأیید نباید بیشتر از ۲۰۰۰ کاراکتر باشد.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values };
  }

  if (!slugResult.ok || !isFormPurpose(purposeRaw)) {
    return {
      formError: "اطلاعات فرم نامعتبر است.",
      values,
    };
  }

  const slug = slugResult.slug;
  const purpose = purposeRaw;

  const existing = await prisma.form.findFirst({
    where: {
      organizationId: organization.id,
      slug,
    },
    select: { id: true },
  });

  if (existing) {
    return {
      fieldErrors: {
        slug: "فرمی با این نامک از قبل وجود دارد. نامک دیگری انتخاب کنید.",
      },
      values,
    };
  }

  try {
    // Form.branchId is optional. Left null in 3.4B-1a (organization-wide form).
    // Submissions later require branchId; that resolution belongs to 3.4B-4.
    await prisma.$transaction(async (tx) => {
      const form = await tx.form.create({
        data: {
          organizationId: organization.id,
          slug,
          purpose,
          isAdmissionForm: purpose === "ADMISSION",
          branchId: null,
        },
        select: { id: true },
      });

      await tx.formVersion.create({
        data: {
          organizationId: organization.id,
          formId: form.id,
          versionNumber: 1,
          status: FormVersionStatus.DRAFT,
          title,
          confirmationMessage,
        },
      });
    });
  } catch (error) {
    const safeMessage = mapPrismaFormError(error);
    const isUniqueViolation =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";

    return {
      fieldErrors: isUniqueViolation ? { slug: safeMessage } : undefined,
      formError: safeMessage,
      values,
    };
  }

  revalidatePath("/admin/forms");
  redirect("/admin/forms");
}
