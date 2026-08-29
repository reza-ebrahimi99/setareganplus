import { DEFAULT_BOOK_TYPES } from "@/lib/books/constants";
import { prisma } from "@/lib/prisma";

export async function ensureBookAgencyProfile(organizationId: string) {
  const existing = await prisma.bookAgencyProfile.findUnique({
    where: { organizationId },
  });
  if (existing && !existing.deletedAt) return existing;

  if (existing?.deletedAt) {
    return prisma.bookAgencyProfile.update({
      where: { id: existing.id },
      data: { deletedAt: null },
    });
  }

  return prisma.bookAgencyProfile.create({
    data: { organizationId },
  });
}

/**
 * Idempotent: only creates missing system types. Never overwrites an admin's
 * edited label on a type that already exists.
 */
export async function ensureDefaultBookTypes(organizationId: string): Promise<void> {
  const existing = await prisma.bookType.findMany({
    where: { organizationId },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((row) => row.code));
  const missing = DEFAULT_BOOK_TYPES.filter((type) => !existingCodes.has(type.code));
  if (missing.length === 0) return;

  await prisma.bookType.createMany({
    data: missing.map((type) => ({
      organizationId,
      code: type.code,
      label: type.label,
      sortOrder: type.sortOrder,
      isSystem: true,
    })),
    skipDuplicates: true,
  });
}
