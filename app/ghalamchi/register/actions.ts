"use server";

import { RegistrationDocumentType } from "@/generated/prisma/enums";
import { saveRegistrationProgress } from "@/lib/registration/draft";
import { uploadRegistrationDocument } from "@/lib/registration/documents";
import { createRegistration } from "@/lib/registration/service";
import type {
  CreateRegistrationInput,
  DetailsStepInput,
  ParentStepInput,
  StudentStepInput,
} from "@/lib/registration/types";

export type SubmitRegistrationActionResult =
  | {
      ok: true;
      registrationNumber: string;
      paymentMessage: string;
      checkoutUrl: string | null;
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function submitRegistrationAction(
  input: CreateRegistrationInput,
): Promise<SubmitRegistrationActionResult> {
  const result = await createRegistration(input);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    ok: true,
    registrationNumber: result.registrationNumber,
    paymentMessage: result.paymentMessage,
    checkoutUrl: result.checkoutUrl,
  };
}

export async function saveRegistrationProgressAction(input: {
  flowKey: string;
  resumeToken?: string | null;
  currentStep: number;
  lastCompletedStep: number;
  student: StudentStepInput;
  parent: ParentStepInput;
  details: DetailsStepInput;
  documentIds?: string[];
}) {
  return saveRegistrationProgress(input);
}

export async function uploadRegistrationDocumentAction(formData: FormData) {
  const resumeToken = String(formData.get("resumeToken") ?? "");
  const documentType = String(
    formData.get("documentType") ?? "",
  ) as RegistrationDocumentType;
  const file = formData.get("file");
  if (!resumeToken) {
    return { ok: false as const, error: "توکن ادامه ثبت‌نام موجود نیست." };
  }
  if (!Object.values(RegistrationDocumentType).includes(documentType)) {
    return { ok: false as const, error: "نوع مدرک نامعتبر است." };
  }
  if (!(file instanceof File)) {
    return { ok: false as const, error: "فایل انتخاب نشده است." };
  }
  return uploadRegistrationDocument({ resumeToken, documentType, file });
}
