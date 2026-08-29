"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveEditableDraft } from "@/lib/forms/resolve-editable-draft";
import {
  assignFieldToRegistrationStep,
  createRegistrationStep,
  deleteRegistrationStep,
  moveFieldWithinRegistrationGroup,
  moveRegistrationStep,
  updateRegistrationStep,
} from "@/lib/forms/registration-step-ops";
import { toPersianDigits } from "@/lib/persian";

export type StepActionState = {
  formError?: string;
  successMessage?: string;
  fieldErrors?: {
    title?: string;
    description?: string;
  };
  values?: {
    title: string;
    description: string;
  };
};

export type SimpleStepActionState = {
  formError?: string;
  successMessage?: string;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateEditor(formId: string) {
  revalidatePath("/admin/forms");
  revalidatePath(`/admin/forms/${formId}`);
}

export async function createStepAction(
  _prevState: StepActionState,
  formData: FormData,
): Promise<StepActionState> {
  const formId = readString(formData, "formId").trim();
  const title = readString(formData, "title");
  const description = readString(formData, "description");
  const values = { title, description };

  const resolved = await resolveEditableDraft(formId);
  if (!resolved.ok) {
    return { formError: resolved.formError, values };
  }

  try {
    const result = await prisma.$transaction(async (tx) =>
      createRegistrationStep(tx, resolved.context, {
        title,
        description: description.trim() || null,
      }),
    );
    if (!result.ok) {
      return {
        formError: result.error,
        values,
      };
    }
  } catch {
    return {
      formError: "افزودن مرحله با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
      values,
    };
  }

  revalidateEditor(resolved.context.formId);
  return { successMessage: "مرحله جدید افزوده شد." };
}

export async function updateStepAction(
  _prevState: StepActionState,
  formData: FormData,
): Promise<StepActionState> {
  const formId = readString(formData, "formId").trim();
  const stepId = readString(formData, "stepId").trim();
  const title = readString(formData, "title");
  const description = readString(formData, "description");
  const values = { title, description };

  if (!stepId) {
    return { formError: "شناسه مرحله نامعتبر است.", values };
  }

  const resolved = await resolveEditableDraft(formId);
  if (!resolved.ok) {
    return { formError: resolved.formError, values };
  }

  try {
    const result = await prisma.$transaction(async (tx) =>
      updateRegistrationStep(tx, resolved.context, {
        stepId,
        title,
        description: description.trim() || null,
      }),
    );
    if (!result.ok) {
      return {
        formError: result.error,
        values,
      };
    }
  } catch {
    return {
      formError: "ویرایش مرحله با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
      values,
    };
  }

  revalidateEditor(resolved.context.formId);
  return { successMessage: "مرحله به‌روز شد." };
}

export async function deleteStepAction(
  _prevState: SimpleStepActionState,
  formData: FormData,
): Promise<SimpleStepActionState> {
  const formId = readString(formData, "formId").trim();
  const stepId = readString(formData, "stepId").trim();

  if (!stepId) {
    return { formError: "شناسه مرحله نامعتبر است." };
  }

  const resolved = await resolveEditableDraft(formId);
  if (!resolved.ok) {
    return { formError: resolved.formError };
  }

  try {
    const result = await prisma.$transaction(async (tx) =>
      deleteRegistrationStep(tx, resolved.context, stepId),
    );
    if (!result.ok) {
      return { formError: result.error };
    }

    revalidateEditor(resolved.context.formId);
    if ((result.unassignedFieldCount ?? 0) > 0) {
      return {
        successMessage: `مرحله حذف شد و ${toPersianDigits(result.unassignedFieldCount ?? 0)} فیلد بدون مرحله باقی ماند.`,
      };
    }
    return { successMessage: "مرحله حذف شد." };
  } catch {
    return {
      formError: "حذف مرحله با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
    };
  }
}

async function moveStep(
  formData: FormData,
  direction: "up" | "down",
): Promise<SimpleStepActionState> {
  const formId = readString(formData, "formId").trim();
  const stepId = readString(formData, "stepId").trim();

  if (!stepId) {
    return { formError: "شناسه مرحله نامعتبر است." };
  }

  const resolved = await resolveEditableDraft(formId);
  if (!resolved.ok) {
    return { formError: resolved.formError };
  }

  try {
    const result = await prisma.$transaction(async (tx) =>
      moveRegistrationStep(tx, resolved.context, stepId, direction),
    );
    if (!result.ok) {
      return { formError: result.error };
    }
  } catch {
    return {
      formError: "جابه‌جایی مرحله با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
    };
  }

  revalidateEditor(resolved.context.formId);
  return { successMessage: "ترتیب مراحل به‌روز شد." };
}

export async function moveStepUpAction(
  _prevState: SimpleStepActionState,
  formData: FormData,
): Promise<SimpleStepActionState> {
  return moveStep(formData, "up");
}

export async function moveStepDownAction(
  _prevState: SimpleStepActionState,
  formData: FormData,
): Promise<SimpleStepActionState> {
  return moveStep(formData, "down");
}

export async function assignFieldToStepAction(
  _prevState: SimpleStepActionState,
  formData: FormData,
): Promise<SimpleStepActionState> {
  const formId = readString(formData, "formId").trim();
  const fieldId = readString(formData, "fieldId").trim();
  const targetStepIdRaw = readString(formData, "targetStepId").trim();
  const targetStepId = targetStepIdRaw.length > 0 ? targetStepIdRaw : null;

  if (!fieldId) {
    return { formError: "شناسه فیلد نامعتبر است." };
  }

  const resolved = await resolveEditableDraft(formId);
  if (!resolved.ok) {
    return { formError: resolved.formError };
  }

  try {
    const result = await prisma.$transaction(async (tx) =>
      assignFieldToRegistrationStep(tx, resolved.context, {
        fieldId,
        targetStepId,
      }),
    );
    if (!result.ok) {
      return { formError: result.error };
    }
  } catch {
    return {
      formError: "انتساب فیلد با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
    };
  }

  revalidateEditor(resolved.context.formId);
  return {
    successMessage: targetStepId
      ? "فیلد به مرحله اختصاص یافت."
      : "فیلد از مرحله جدا شد و بدون حذف باقی ماند.",
  };
}

async function moveFieldInGroup(
  formData: FormData,
  direction: "up" | "down",
): Promise<SimpleStepActionState> {
  const formId = readString(formData, "formId").trim();
  const fieldId = readString(formData, "fieldId").trim();
  const stepIdRaw = readString(formData, "stepId").trim();
  const stepId = stepIdRaw.length > 0 ? stepIdRaw : null;

  if (!fieldId) {
    return { formError: "شناسه فیلد نامعتبر است." };
  }

  const resolved = await resolveEditableDraft(formId);
  if (!resolved.ok) {
    return { formError: resolved.formError };
  }

  try {
    const result = await prisma.$transaction(async (tx) =>
      moveFieldWithinRegistrationGroup(tx, resolved.context, {
        fieldId,
        stepId,
        direction,
      }),
    );
    if (!result.ok) {
      return { formError: result.error };
    }
  } catch {
    return {
      formError: "جابه‌جایی فیلد با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
    };
  }

  revalidateEditor(resolved.context.formId);
  return { successMessage: "ترتیب فیلدها به‌روز شد." };
}

export async function moveStepFieldUpAction(
  _prevState: SimpleStepActionState,
  formData: FormData,
): Promise<SimpleStepActionState> {
  return moveFieldInGroup(formData, "up");
}

export async function moveStepFieldDownAction(
  _prevState: SimpleStepActionState,
  formData: FormData,
): Promise<SimpleStepActionState> {
  return moveFieldInGroup(formData, "down");
}
