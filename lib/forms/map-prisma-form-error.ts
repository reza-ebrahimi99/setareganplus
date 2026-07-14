import { Prisma } from "@/generated/prisma/client";

/**
 * Maps known Prisma errors to safe Persian messages for Form Builder.
 * Never forwards raw database messages to the client.
 */
export function mapPrismaFormError(error: unknown): string {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return "فرمی با این نامک از قبل وجود دارد. نامک دیگری انتخاب کنید.";
  }

  return "ثبت فرم با خطا مواجه شد. لطفاً دوباره تلاش کنید.";
}
