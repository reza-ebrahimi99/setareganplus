import { BOOKS_FEATURE_FLAG_KEY, BOOKS_HARD_OFF_ENV } from "@/lib/books/constants";
import { prisma } from "@/lib/prisma";

export function isBooksHardOff(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const raw = env[BOOKS_HARD_OFF_ENV];
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

/**
 * Pure flag resolution. No row and enabled=false both mean OFF.
 */
export function resolveBooksFlag(input: {
  hardOff: boolean;
  orgFlagEnabled: boolean | null;
}): boolean {
  if (input.hardOff) return false;
  return input.orgFlagEnabled === true;
}

/**
 * Organization-scoped Book Commerce ERP gate. Default OFF.
 * Existing production orgs have no flag row and must remain unchanged.
 */
export async function isBookCommerceEnabled(organizationId: string): Promise<boolean> {
  if (isBooksHardOff()) return false;
  const row = await prisma.organizationFeatureFlag.findUnique({
    where: {
      organizationId_key: {
        organizationId,
        key: BOOKS_FEATURE_FLAG_KEY,
      },
    },
    select: { enabled: true },
  });
  return resolveBooksFlag({
    hardOff: false,
    orgFlagEnabled: row?.enabled ?? null,
  });
}
