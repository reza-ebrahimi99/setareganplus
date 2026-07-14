"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import {
  FormVersionStatus,
  type FormFieldType,
} from "@/generated/prisma/enums";
import {
  isChoiceFieldType,
  isFormFieldType,
} from "@/lib/forms/form-field-type-labels";
import { parseChoiceOptionsText } from "@/lib/forms/choice-options";
import { normalizeFieldKey } from "@/lib/forms/normalize-field-key";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";

export type FieldFormFieldErrors = {
  label?: string;
  fieldKey?: string;
  type?: string;
  optionsText?: string;
  helpText?: string;
  placeholder?: string;
};

export type FieldFormValues = {
  label: string;
  fieldKey: string;
  type: string;
  required: boolean;
  helpText: string;
  placeholder: string;
  optionsText: string;
};

export type FieldActionState = {
  fieldErrors?: FieldFormFieldErrors;
  formError?: string;
  values?: FieldFormValues;
  successMessage?: string;
};

export type SimpleFieldActionState = {
  formError?: string;
  successMessage?: string;
};

type DraftContext = {
  organizationId: string;
  formId: string;
  formVersionId: string;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readCheckbox(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function revalidateEditor(formId: string) {
  revalidatePath("/admin/forms");
  revalidatePath(`/admin/forms/${formId}`);
}

async function resolveDraftContext(
  formId: string,
): Promise<
  | { ok: true; context: DraftContext }
  | { ok: false; formError: string }
> {
  // TODO(auth): Enforce authenticated admin session + membership before mutations.
  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    return {
      ok: false,
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
    select: { id: true },
  });

  if (!form) {
    return { ok: false, formError: "فرم مورد نظر یافت نشد." };
  }

  const draft = await prisma.formVersion.findFirst({
    where: {
      organizationId: organization.id,
      formId: form.id,
      status: FormVersionStatus.DRAFT,
    },
    orderBy: { versionNumber: "desc" },
    select: { id: true },
  });

  if (!draft) {
    return {
      ok: false,
      formError:
        "نسخه پیش‌نویس قابل ویرایش برای این فرم وجود ندارد. فقط نسخه‌های پیش‌نویس قابل ویرایش هستند.",
    };
  }

  return {
    ok: true,
    context: {
      organizationId: organization.id,
      formId: form.id,
      formVersionId: draft.id,
    },
  };
}

function parseFieldInputs(formData: FormData): {
  values: FieldFormValues;
  fieldErrors: FieldFormFieldErrors;
  type?: FormFieldType;
  fieldKey?: string;
  config?: Prisma.InputJsonValue;
} {
  const label = readString(formData, "label").trim();
  const rawFieldKey = readString(formData, "fieldKey");
  const typeRaw = readString(formData, "type").trim();
  const required = readCheckbox(formData, "required");
  const helpText = readString(formData, "helpText").trim();
  const placeholder = readString(formData, "placeholder").trim();
  const optionsText = readString(formData, "optionsText");

  const values: FieldFormValues = {
    label,
    fieldKey: rawFieldKey.trim().toLowerCase(),
    type: typeRaw,
    required,
    helpText,
    placeholder,
    optionsText,
  };

  const fieldErrors: FieldFormFieldErrors = {};

  if (!label) {
    fieldErrors.label = "برچسب سؤال الزامی است.";
  } else if (label.length > 200) {
    fieldErrors.label = "برچسب سؤال نباید بیشتر از ۲۰۰ کاراکتر باشد.";
  }

  const keyResult = normalizeFieldKey(rawFieldKey);
  if (!keyResult.ok) {
    fieldErrors.fieldKey = keyResult.error;
  }

  let type: FormFieldType | undefined;
  if (!typeRaw) {
    fieldErrors.type = "نوع فیلد را انتخاب کنید.";
  } else if (!isFormFieldType(typeRaw)) {
    fieldErrors.type = "نوع فیلد نامعتبر است.";
  } else {
    type = typeRaw;
  }

  if (helpText.length > 500) {
    fieldErrors.helpText = "متن راهنما نباید بیشتر از ۵۰۰ کاراکتر باشد.";
  }

  if (placeholder.length > 200) {
    fieldErrors.placeholder = "متن جایگزین نباید بیشتر از ۲۰۰ کاراکتر باشد.";
  }

  let config: Prisma.InputJsonValue = {};

  if (type && isChoiceFieldType(type)) {
    const parsed = parseChoiceOptionsText(optionsText);
    if (!parsed.ok) {
      fieldErrors.optionsText = parsed.error;
    } else {
      config = parsed.config;
    }
  }

  return {
    values,
    fieldErrors,
    type,
    fieldKey: keyResult.ok ? keyResult.fieldKey : undefined,
    config,
  };
}

async function assertFieldBelongsToDraft(
  context: DraftContext,
  fieldId: string,
) {
  return prisma.formField.findFirst({
    where: {
      id: fieldId,
      organizationId: context.organizationId,
      formVersionId: context.formVersionId,
    },
    select: {
      id: true,
      sortOrder: true,
      fieldKey: true,
    },
  });
}

async function normalizeSortOrders(
  tx: Prisma.TransactionClient,
  context: DraftContext,
) {
  const fields = await tx.formField.findMany({
    where: {
      organizationId: context.organizationId,
      formVersionId: context.formVersionId,
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  // Two-pass rewrite to satisfy unique (org, version, sortOrder).
  for (let index = 0; index < fields.length; index += 1) {
    await tx.formField.update({
      where: {
        organizationId_id: {
          organizationId: context.organizationId,
          id: fields[index].id,
        },
      },
      data: { sortOrder: -(index + 1) },
    });
  }

  for (let index = 0; index < fields.length; index += 1) {
    await tx.formField.update({
      where: {
        organizationId_id: {
          organizationId: context.organizationId,
          id: fields[index].id,
        },
      },
      data: { sortOrder: index + 1 },
    });
  }
}

export async function createFieldAction(
  _prevState: FieldActionState,
  formData: FormData,
): Promise<FieldActionState> {
  const formId = readString(formData, "formId").trim();
  if (!formId) {
    return { formError: "شناسه فرم نامعتبر است." };
  }

  const resolved = await resolveDraftContext(formId);
  if (!resolved.ok) {
    return { formError: resolved.formError };
  }

  const parsed = parseFieldInputs(formData);
  if (Object.keys(parsed.fieldErrors).length > 0) {
    return { fieldErrors: parsed.fieldErrors, values: parsed.values };
  }

  if (!parsed.type || !parsed.fieldKey) {
    return { formError: "اطلاعات فیلد نامعتبر است.", values: parsed.values };
  }

  const existingKey = await prisma.formField.findFirst({
    where: {
      organizationId: resolved.context.organizationId,
      formVersionId: resolved.context.formVersionId,
      fieldKey: parsed.fieldKey,
    },
    select: { id: true },
  });

  if (existingKey) {
    return {
      fieldErrors: {
        fieldKey: "کلید فیلد در این نسخه تکراری است.",
      },
      values: parsed.values,
    };
  }

  const aggregate = await prisma.formField.aggregate({
    where: {
      organizationId: resolved.context.organizationId,
      formVersionId: resolved.context.formVersionId,
    },
    _max: { sortOrder: true },
  });

  const sortOrder = (aggregate._max.sortOrder ?? 0) + 1;

  try {
    await prisma.formField.create({
      data: {
        organizationId: resolved.context.organizationId,
        formVersionId: resolved.context.formVersionId,
        fieldKey: parsed.fieldKey,
        sortOrder,
        type: parsed.type,
        label: parsed.values.label,
        helpText: parsed.values.helpText || null,
        placeholder: parsed.values.placeholder || null,
        required: parsed.values.required,
        config: parsed.config ?? {},
      },
    });

    await prisma.form.update({
      where: {
        organizationId_id: {
          organizationId: resolved.context.organizationId,
          id: resolved.context.formId,
        },
      },
      data: { updatedAt: new Date() },
    });
  } catch (error) {
    const isUnique =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";

    return {
      fieldErrors: isUnique
        ? { fieldKey: "کلید فیلد در این نسخه تکراری است." }
        : undefined,
      formError: isUnique
        ? "کلید فیلد در این نسخه تکراری است."
        : "ذخیره سؤال با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
      values: parsed.values,
    };
  }

  revalidateEditor(resolved.context.formId);
  return { successMessage: "سؤال با موفقیت اضافه شد." };
}

export async function updateFieldAction(
  _prevState: FieldActionState,
  formData: FormData,
): Promise<FieldActionState> {
  const formId = readString(formData, "formId").trim();
  const fieldId = readString(formData, "fieldId").trim();

  if (!formId || !fieldId) {
    return { formError: "شناسه فرم یا فیلد نامعتبر است." };
  }

  const resolved = await resolveDraftContext(formId);
  if (!resolved.ok) {
    return { formError: resolved.formError };
  }

  const existing = await assertFieldBelongsToDraft(resolved.context, fieldId);
  if (!existing) {
    return { formError: "فیلد مورد نظر در نسخه پیش‌نویس یافت نشد." };
  }

  const parsed = parseFieldInputs(formData);
  if (Object.keys(parsed.fieldErrors).length > 0) {
    return { fieldErrors: parsed.fieldErrors, values: parsed.values };
  }

  if (!parsed.type || !parsed.fieldKey) {
    return { formError: "اطلاعات فیلد نامعتبر است.", values: parsed.values };
  }

  if (parsed.fieldKey !== existing.fieldKey) {
    const duplicate = await prisma.formField.findFirst({
      where: {
        organizationId: resolved.context.organizationId,
        formVersionId: resolved.context.formVersionId,
        fieldKey: parsed.fieldKey,
        NOT: { id: fieldId },
      },
      select: { id: true },
    });

    if (duplicate) {
      return {
        fieldErrors: {
          fieldKey: "کلید فیلد در این نسخه تکراری است.",
        },
        values: parsed.values,
      };
    }
  }

  const config: Prisma.InputJsonValue = isChoiceFieldType(parsed.type)
    ? (parsed.config ?? {})
    : {};

  try {
    await prisma.formField.update({
      where: {
        organizationId_id: {
          organizationId: resolved.context.organizationId,
          id: fieldId,
        },
      },
      data: {
        fieldKey: parsed.fieldKey,
        type: parsed.type,
        label: parsed.values.label,
        helpText: parsed.values.helpText || null,
        placeholder: parsed.values.placeholder || null,
        required: parsed.values.required,
        config,
      },
    });

    await prisma.form.update({
      where: {
        organizationId_id: {
          organizationId: resolved.context.organizationId,
          id: resolved.context.formId,
        },
      },
      data: { updatedAt: new Date() },
    });
  } catch (error) {
    const isUnique =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";

    return {
      fieldErrors: isUnique
        ? { fieldKey: "کلید فیلد در این نسخه تکراری است." }
        : undefined,
      formError: isUnique
        ? "کلید فیلد در این نسخه تکراری است."
        : "ذخیره سؤال با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
      values: parsed.values,
    };
  }

  revalidateEditor(resolved.context.formId);
  return {
    successMessage: "سؤال با موفقیت به‌روزرسانی شد.",
    values: parsed.values,
  };
}

export async function deleteFieldAction(
  _prevState: SimpleFieldActionState,
  formData: FormData,
): Promise<SimpleFieldActionState> {
  const formId = readString(formData, "formId").trim();
  const fieldId = readString(formData, "fieldId").trim();

  if (!formId || !fieldId) {
    return { formError: "شناسه فرم یا فیلد نامعتبر است." };
  }

  const resolved = await resolveDraftContext(formId);
  if (!resolved.ok) {
    return { formError: resolved.formError };
  }

  const existing = await assertFieldBelongsToDraft(resolved.context, fieldId);
  if (!existing) {
    return { formError: "فیلد مورد نظر در نسخه پیش‌نویس یافت نشد." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.formField.delete({
        where: {
          organizationId_id: {
            organizationId: resolved.context.organizationId,
            id: fieldId,
          },
        },
      });

      await normalizeSortOrders(tx, resolved.context);

      await tx.form.update({
        where: {
          organizationId_id: {
            organizationId: resolved.context.organizationId,
            id: resolved.context.formId,
          },
        },
        data: { updatedAt: new Date() },
      });
    });
  } catch {
    return { formError: "حذف سؤال با خطا مواجه شد. لطفاً دوباره تلاش کنید." };
  }

  revalidateEditor(resolved.context.formId);
  return { successMessage: "سؤال حذف شد." };
}

async function moveField(
  formData: FormData,
  direction: "up" | "down",
): Promise<SimpleFieldActionState> {
  const formId = readString(formData, "formId").trim();
  const fieldId = readString(formData, "fieldId").trim();

  if (!formId || !fieldId) {
    return { formError: "شناسه فرم یا فیلد نامعتبر است." };
  }

  const resolved = await resolveDraftContext(formId);
  if (!resolved.ok) {
    return { formError: resolved.formError };
  }

  const fields = await prisma.formField.findMany({
    where: {
      organizationId: resolved.context.organizationId,
      formVersionId: resolved.context.formVersionId,
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });

  const index = fields.findIndex((field) => field.id === fieldId);
  if (index < 0) {
    return { formError: "فیلد مورد نظر در نسخه پیش‌نویس یافت نشد." };
  }

  if (direction === "up" && index === 0) {
    return { formError: "این سؤال در ابتدای فهرست است." };
  }

  if (direction === "down" && index === fields.length - 1) {
    return { formError: "این سؤال در انتهای فهرست است." };
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  const current = fields[index];
  const neighbor = fields[swapIndex];
  const tempOrder = Number.MIN_SAFE_INTEGER + current.sortOrder;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.formField.update({
        where: {
          organizationId_id: {
            organizationId: resolved.context.organizationId,
            id: current.id,
          },
        },
        data: { sortOrder: tempOrder },
      });

      await tx.formField.update({
        where: {
          organizationId_id: {
            organizationId: resolved.context.organizationId,
            id: neighbor.id,
          },
        },
        data: { sortOrder: current.sortOrder },
      });

      await tx.formField.update({
        where: {
          organizationId_id: {
            organizationId: resolved.context.organizationId,
            id: current.id,
          },
        },
        data: { sortOrder: neighbor.sortOrder },
      });

      await tx.form.update({
        where: {
          organizationId_id: {
            organizationId: resolved.context.organizationId,
            id: resolved.context.formId,
          },
        },
        data: { updatedAt: new Date() },
      });
    });
  } catch {
    return {
      formError: "جابه‌جایی سؤال با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
    };
  }

  revalidateEditor(resolved.context.formId);
  return { successMessage: "ترتیب سؤال‌ها به‌روز شد." };
}

export async function moveFieldUpAction(
  _prevState: SimpleFieldActionState,
  formData: FormData,
): Promise<SimpleFieldActionState> {
  return moveField(formData, "up");
}

export async function moveFieldDownAction(
  _prevState: SimpleFieldActionState,
  formData: FormData,
): Promise<SimpleFieldActionState> {
  return moveField(formData, "down");
}
