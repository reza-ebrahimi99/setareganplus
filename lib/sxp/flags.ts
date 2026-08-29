import { SXP_FEATURE_FLAG_KEY, SXP_HARD_OFF_ENV } from "@/lib/sxp/constants";
import { prisma } from "@/lib/prisma";

export function isSxpHardOff(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const raw = env[SXP_HARD_OFF_ENV];
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

/**
 * Pure flag resolution used by tests and `isSxpEnabled`.
 * No row and enabled=false both mean OFF.
 */
export function resolveSxpFlag(input: {
  hardOff: boolean;
  orgFlagEnabled: boolean | null;
}): boolean {
  if (input.hardOff) return false;
  return input.orgFlagEnabled === true;
}

/**
 * Organization-scoped SXP gate. Default OFF.
 * Existing production orgs have no flag row and must remain unchanged.
 */
export async function isSxpEnabled(organizationId: string): Promise<boolean> {
  if (isSxpHardOff()) return false;
  const row = await prisma.organizationFeatureFlag.findUnique({
    where: {
      organizationId_key: {
        organizationId,
        key: SXP_FEATURE_FLAG_KEY,
      },
    },
    select: { enabled: true },
  });
  return resolveSxpFlag({
    hardOff: false,
    orgFlagEnabled: row?.enabled ?? null,
  });
}
