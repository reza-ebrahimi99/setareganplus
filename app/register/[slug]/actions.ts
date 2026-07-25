"use server";

import { RegistrationDocumentType } from "@/generated/prisma/enums";
import { saveRegistrationProgress } from "@/lib/registration/draft";
import { uploadRegistrationDocument } from "@/lib/registration/documents";
import { previewRegistrationPromotionCode } from "@/lib/promotions/preview";
import { createRegistration } from "@/lib/registration/service";
import type {
  CreateRegistrationInput,
  DetailsStepInput,
  ParentStepInput,
  StudentStepInput,
} from "@/lib/registration/types";

export type PreviewPromotionActionResult = Awaited<
  ReturnType<typeof previewRegistrationPromotionCode>
>;

export async function previewPromotionCodeAction(input: {
  flowKey: string;
  details: DetailsStepInput;
  redeemCode: string;
  nationalCode?: string | null;
}): Promise<PreviewPromotionActionResult> {
  return previewRegistrationPromotionCode(input);
}

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
  try {
    const result = await createRegistration(input);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        fieldErrors: result.fieldErrors,
      };
    }

    const checkoutUrl = result.checkoutUrl?.trim() || null;
    if (result.checkoutUrl != null && !checkoutUrl) {
      console.error(
        "[registration] checkoutUrl was empty after successful createRegistration",
        { registrationNumber: result.registrationNumber },
      );
      return {
        ok: false,
        error:
          "لینک درگاه پرداخت دریافت نشد. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.",
      };
    }

    return {
      ok: true,
      registrationNumber: result.registrationNumber,
      paymentMessage: result.paymentMessage,
      checkoutUrl,
    };
  } catch (error) {
    console.error("[registration] submitRegistrationAction failed", error);
    return {
      ok: false,
      error:
        "ثبت‌نام یا آماده‌سازی پرداخت با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
    };
  }
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
  formAnswers?: CreateRegistrationInput["formAnswers"];
  attribution?: CreateRegistrationInput["attribution"];
  leadId?: string | null;
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
