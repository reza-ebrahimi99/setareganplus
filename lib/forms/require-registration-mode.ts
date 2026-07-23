import {
  FormMode,
  type FormMode as FormModeValue,
} from "@/generated/prisma/enums";

/**
 * Shared domain rule for Registration-only Form Builder operations
 * (step builder, registration document uploads, etc.).
 */
export function requireRegistrationFormMode(
  mode: FormModeValue,
): { ok: true } | { ok: false; formError: string } {
  if (mode !== FormMode.REGISTRATION) {
    return {
      ok: false,
      formError:
        "این عملیات فقط برای فرم‌های حالت «ثبت‌نام» مجاز است. این فرم در حالت استاندارد است.",
    };
  }
  return { ok: true };
}
