"use server";

import { createRegistration } from "@/lib/registration/service";
import type { CreateRegistrationInput } from "@/lib/registration/types";

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
