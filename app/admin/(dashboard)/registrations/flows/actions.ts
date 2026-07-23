"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { RegistrationProductType } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  formatDateTimeLocalInTehran,
  parseTehranDateTimeLocal,
} from "@/lib/forms/tehran-datetime";
import {
  archiveRegistrationFlow,
  createRegistrationFlow,
  deleteRegistrationFlowDocumentRequirement,
  isRegistrationDocumentType,
  isRegistrationFlowPaymentMode,
  isRegistrationProductType,
  publishRegistrationFlow,
  reorderRegistrationFlowDocumentRequirements,
  softDeleteRegistrationFlow,
  unpublishRegistrationFlow,
  updateRegistrationFlowGeneral,
  updateRegistrationFlowSteps,
  upsertRegistrationFlowDocumentRequirement,
} from "@/lib/registration/flows/admin";
import { getPublicRegistrationFlowPath } from "@/lib/registration/flows/public-url";

export type RegistrationFlowActionState = {
  formError?: string;
  successMessage?: string;
  fieldErrors?: Record<string, string>;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readOptionalInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function readOptionalString(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapFlowError(error: unknown): string {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  switch (code) {
    case "TITLE_REQUIRED":
      return "عنوان باید حداقل ۲ کاراکتر باشد.";
    case "SLUG_DUPLICATE":
      return "این نامک قبلاً استفاده شده است. نامک دیگری انتخاب کنید.";
    case "SLUG_INVALID":
      return "نامک معتبر نیست. از حروف انگلیسی، عدد و خط تیره استفاده کنید.";
    case "NOT_FOUND":
      return "جریان ثبت‌نام یافت نشد.";
    case "FORM_NOT_FOUND":
      return "فرم منتشرشده انتخاب‌شده یافت نشد.";
    case "COVER_NOT_FOUND":
      return "تصویر جلد انتخاب‌شده یافت نشد.";
    case "INVALID_DATES":
      return "تاریخ پایان باید بعد از تاریخ شروع باشد.";
    case "NO_STEPS":
      return "حداقل یک مرحله باید فعال باشد.";
    case "FORM_REQUIRED":
      return "برای انتشار، اتصال فرم منتشرشده الزامی است.";
    case "PAYMENT_AMOUNT_REQUIRED":
      return "برای این حالت پرداخت، مبلغ باید بیشتر از صفر باشد.";
    default:
      return "ایجاد جریان ثبت‌نام انجام نشد.";
  }
}

function revalidateRegistrationFlow(slug?: string) {
  revalidatePath("/admin/registrations/flows");
  if (slug) {
    revalidatePath(getPublicRegistrationFlowPath(slug));
    revalidatePath(`${getPublicRegistrationFlowPath(slug)}/wizard`);
  }
}

export type CreateRegistrationFlowState = {
  success?: boolean;
  formError?: string;
  fieldErrors?: {
    title?: string;
    slug?: string;
    description?: string;
    productType?: string;
  };
  values?: {
    title: string;
    slug: string;
    description: string;
    productType: string;
  };
};

export async function createRegistrationFlowAction(
  _prev: CreateRegistrationFlowState,
  formData: FormData,
): Promise<CreateRegistrationFlowState> {
  const session = await requirePermission("registration_flows.manage");
  const organizationId = session.organization.id;

  const title = readString(formData, "title").trim();
  const slug = readString(formData, "slug").trim();
  const description = readString(formData, "description").trim();
  const productTypeRaw = readString(formData, "productType").trim();

  const submittedValues = {
    title,
    slug,
    description,
    productType: productTypeRaw || RegistrationProductType.SCHOOL_REGISTRATION,
  };

  const fieldErrors: NonNullable<CreateRegistrationFlowState["fieldErrors"]> =
    {};
  if (title.length < 2) {
    fieldErrors.title = "عنوان باید حداقل ۲ کاراکتر باشد.";
  }
  if (productTypeRaw && !isRegistrationProductType(productTypeRaw)) {
    fieldErrors.productType = "نوع محصول نامعتبر است.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      formError: "لطفاً خطاهای فرم را برطرف کنید.",
      fieldErrors,
      values: submittedValues,
    };
  }

  let createdFlowId: string;
  let createdSlug: string;

  try {
    const flow = await createRegistrationFlow({
      organizationId,
      title,
      slug: slug || undefined,
      description,
      productType: isRegistrationProductType(productTypeRaw)
        ? productTypeRaw
        : RegistrationProductType.SCHOOL_REGISTRATION,
    });
    createdFlowId = flow.id;
    createdSlug = flow.slug;
  } catch (error) {
    console.error("CREATE_REGISTRATION_FLOW_FAILED", {
      error,
      submittedValues,
    });

    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "SLUG_DUPLICATE" || code === "SLUG_INVALID") {
      return {
        success: false,
        formError: mapFlowError(error),
        fieldErrors: {
          slug: mapFlowError(error),
        },
        values: submittedValues,
      };
    }
    if (code === "TITLE_REQUIRED") {
      return {
        success: false,
        formError: mapFlowError(error),
        fieldErrors: { title: mapFlowError(error) },
        values: submittedValues,
      };
    }

    return {
      success: false,
      formError: "ایجاد جریان ثبت‌نام انجام نشد.",
      values: submittedValues,
    };
  }

  revalidatePath("/admin/registrations/flows");
  revalidateRegistrationFlow(createdSlug);
  // redirect() throws NEXT_REDIRECT — must stay outside catch.
  redirect(`/admin/registrations/flows/${createdFlowId}`);
}

function parseFlowUpdateInput(
  formData: FormData,
  organizationId: string,
  flowId: string,
) {
  const title = readString(formData, "title").trim();
  const slug = readString(formData, "slug").trim();
  const description = readString(formData, "description");
  const coverMediaIdRaw = readString(formData, "coverMediaId").trim();
  const coverMediaId = coverMediaIdRaw.length > 0 ? coverMediaIdRaw : null;
  const productTypeRaw = readString(formData, "productType").trim();
  const formIdRaw = readString(formData, "formId").trim();
  const formId = formIdRaw.length > 0 ? formIdRaw : null;
  const opensAt = parseTehranDateTimeLocal(readString(formData, "opensAt"));
  const closesAt = parseTehranDateTimeLocal(readString(formData, "closesAt"));
  const academicYear = readOptionalString(readString(formData, "academicYear"));
  const gradeTargets = readOptionalString(readString(formData, "gradeTargets"));
  const courseTarget = readOptionalString(readString(formData, "courseTarget"));
  const capacity = readOptionalInt(readString(formData, "capacity"));
  const paymentModeRaw = readString(formData, "paymentMode").trim();
  const paymentAmountRials =
    Number.parseInt(readString(formData, "paymentAmountRials") || "0", 10) || 0;
  const paymentTitle = readOptionalString(readString(formData, "paymentTitle"));
  const paymentDeadlineAt = parseTehranDateTimeLocal(
    readString(formData, "paymentDeadlineAt"),
  );

  if (!isRegistrationProductType(productTypeRaw)) {
    throw new Error("INVALID_PRODUCT_TYPE");
  }
  if (!isRegistrationFlowPaymentMode(paymentModeRaw)) {
    throw new Error("INVALID_PAYMENT_MODE");
  }

  return {
    organizationId,
    flowId,
    title,
    slug,
    description,
    coverMediaId,
    productType: productTypeRaw,
    opensAt,
    closesAt,
    academicYear,
    gradeTargets,
    courseTarget,
    capacity,
    paymentMode: paymentModeRaw,
    paymentAmountRials,
    paymentTitle,
    paymentDeadlineAt,
    formId,
  };
}

export async function updateRegistrationFlowAction(
  _prev: RegistrationFlowActionState,
  formData: FormData,
): Promise<RegistrationFlowActionState> {
  const session = await requirePermission("registration_flows.manage");
  const flowId = readString(formData, "flowId").trim();
  if (!flowId) {
    return { formError: "شناسه جریان نامعتبر است." };
  }

  try {
    const input = parseFlowUpdateInput(
      formData,
      session.organization.id,
      flowId,
    );
    await updateRegistrationFlowGeneral(input);
    revalidateRegistrationFlow(input.slug);
    revalidatePath(`/admin/registrations/flows/${flowId}`);
    return { successMessage: "تغییرات ذخیره شد." };
  } catch (error) {
    return { formError: mapFlowError(error) };
  }
}

export async function updateRegistrationFlowStepsAction(
  _prev: RegistrationFlowActionState,
  formData: FormData,
): Promise<RegistrationFlowActionState> {
  const session = await requirePermission("registration_flows.manage");
  const flowId = readString(formData, "flowId").trim();
  if (!flowId) {
    return { formError: "شناسه جریان نامعتبر است." };
  }

  const stepIds = formData.getAll("stepId").map(String);
  const steps = stepIds.map((id, index) => ({
    id,
    enabled: readString(formData, `enabled_${id}`) === "true",
    sortOrder: index,
    label: readString(formData, `label_${id}`),
  }));

  try {
    await updateRegistrationFlowSteps({
      organizationId: session.organization.id,
      flowId,
      steps,
    });
    revalidatePath("/admin/registrations/flows");
    revalidatePath(`/admin/registrations/flows/${flowId}`);
    return { successMessage: "مراحل ذخیره شد." };
  } catch (error) {
    return { formError: mapFlowError(error) };
  }
}

export async function upsertDocumentRequirementAction(
  _prev: RegistrationFlowActionState,
  formData: FormData,
): Promise<RegistrationFlowActionState> {
  const session = await requirePermission("registration_flows.manage");
  const flowId = readString(formData, "flowId").trim();
  const requirementIdRaw = readString(formData, "requirementId").trim();
  const documentTypeRaw = readString(formData, "documentType").trim();

  if (!flowId || !isRegistrationDocumentType(documentTypeRaw)) {
    return { formError: "اطلاعات مدرک نامعتبر است." };
  }

  const maxSizeMb = Number.parseFloat(readString(formData, "maxSizeMb") || "5");
  const maxSizeBytes = Math.floor(maxSizeMb * 1024 * 1024);

  try {
    await upsertRegistrationFlowDocumentRequirement({
      organizationId: session.organization.id,
      flowId,
      requirementId: requirementIdRaw || undefined,
      title: readString(formData, "title"),
      helpText: readString(formData, "helpText"),
      documentType: documentTypeRaw,
      required: readString(formData, "required") === "true",
      acceptedMimeTypes: readString(formData, "acceptedMimeTypes"),
      maxSizeBytes,
      requirementKey: readString(formData, "requirementKey") || undefined,
    });
    revalidatePath("/admin/registrations/flows");
    revalidatePath(`/admin/registrations/flows/${flowId}`);
    return { successMessage: "مدرک ذخیره شد." };
  } catch (error) {
    return { formError: mapFlowError(error) };
  }
}

export async function deleteDocumentRequirementAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("registration_flows.manage");
  const flowId = readString(formData, "flowId").trim();
  const requirementId = readString(formData, "requirementId").trim();
  if (!flowId || !requirementId) return;

  await deleteRegistrationFlowDocumentRequirement({
    organizationId: session.organization.id,
    flowId,
    requirementId,
  });
  revalidatePath("/admin/registrations/flows");
  revalidatePath(`/admin/registrations/flows/${flowId}`);
}

export async function reorderDocumentRequirementsAction(
  _prev: RegistrationFlowActionState,
  formData: FormData,
): Promise<RegistrationFlowActionState> {
  const session = await requirePermission("registration_flows.manage");
  const flowId = readString(formData, "flowId").trim();
  if (!flowId) {
    return { formError: "شناسه جریان نامعتبر است." };
  }

  const orderedIds = formData.getAll("orderedId").map(String);

  try {
    await reorderRegistrationFlowDocumentRequirements({
      organizationId: session.organization.id,
      flowId,
      orderedIds,
    });
    revalidatePath(`/admin/registrations/flows/${flowId}`);
    return { successMessage: "ترتیب مدارک به‌روز شد." };
  } catch (error) {
    return { formError: mapFlowError(error) };
  }
}

async function lifecycleAction(
  formData: FormData,
  action: "publish" | "unpublish" | "archive" | "delete",
): Promise<RegistrationFlowActionState> {
  const session = await requirePermission("registration_flows.manage");
  const flowId = readString(formData, "flowId").trim();
  const slug = readString(formData, "slug").trim();
  if (!flowId) {
    return { formError: "شناسه جریان نامعتبر است." };
  }

  const input = {
    organizationId: session.organization.id,
    flowId,
  };

  try {
    if (action === "publish") {
      await publishRegistrationFlow(input);
    } else if (action === "unpublish") {
      await unpublishRegistrationFlow(input);
    } else if (action === "archive") {
      await archiveRegistrationFlow(input);
    } else {
      await softDeleteRegistrationFlow(input);
      revalidateRegistrationFlow(slug);
      redirect("/admin/registrations/flows");
    }

    revalidateRegistrationFlow(slug);
    revalidatePath(`/admin/registrations/flows/${flowId}`);
    const messages = {
      publish: "جریان منتشر شد.",
      unpublish: "انتشار لغو شد.",
      archive: "جریان بایگانی شد.",
      delete: "",
    };
    return { successMessage: messages[action] };
  } catch (error) {
    return { formError: mapFlowError(error) };
  }
}

export async function publishRegistrationFlowAction(
  _prev: RegistrationFlowActionState,
  formData: FormData,
): Promise<RegistrationFlowActionState> {
  return lifecycleAction(formData, "publish");
}

export async function unpublishRegistrationFlowAction(
  _prev: RegistrationFlowActionState,
  formData: FormData,
): Promise<RegistrationFlowActionState> {
  return lifecycleAction(formData, "unpublish");
}

export async function archiveRegistrationFlowAction(
  _prev: RegistrationFlowActionState,
  formData: FormData,
): Promise<RegistrationFlowActionState> {
  return lifecycleAction(formData, "archive");
}

export async function softDeleteRegistrationFlowAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("registration_flows.manage");
  const flowId = readString(formData, "flowId").trim();
  const slug = readString(formData, "slug").trim();
  if (!flowId) return;

  await softDeleteRegistrationFlow({
    organizationId: session.organization.id,
    flowId,
  });
  revalidateRegistrationFlow(slug);
  redirect("/admin/registrations/flows");
}

export { formatDateTimeLocalInTehran };
