/**
 * Map Prisma / unknown errors to safe Persian UI messages.
 * Never forward raw database text to clients.
 */

import { Prisma } from "@/generated/prisma/client";

export function persianPrismaError(
  error: unknown,
  fallback = "عملیات انجام نشد. لطفاً دوباره تلاش کنید.",
): string {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return "این رکورد با دادهٔ تکراری تداخل دارد.";
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  ) {
    return "ارتباط با رکورد مرتبط معتبر نیست.";
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    return "رکورد مورد نظر یافت نشد.";
  }
  return fallback;
}

export function isPrismaUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
