/**
 * Guidance ERP — organization-scoped root feature flag.
 * Reuses OrganizationFeatureFlag (same contract as Books / SXP).
 * Isolated module on purpose — there is no shared flag helper to extend yet.
 * Child keys in constants are reserved; only the root key is resolved here.
 */

import {
  GUIDANCE_FEATURE_FLAG_KEY,
  GUIDANCE_HARD_OFF_ENV,
} from "@/lib/guidance/constants";
import { prisma } from "@/lib/prisma";

export function isGuidanceHardOff(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const raw = env[GUIDANCE_HARD_OFF_ENV];
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

/**
 * Pure flag resolution for tests and `isGuidanceEnabled`.
 * No row and enabled=false both mean OFF.
 */
export function resolveGuidanceFlag(input: {
  hardOff: boolean;
  orgFlagEnabled: boolean | null;
}): boolean {
  if (input.hardOff) return false;
  return input.orgFlagEnabled === true;
}

/**
 * Organization-scoped Guidance ERP gate. Default OFF.
 * Existing production orgs with no flag row remain unchanged.
 */
export async function isGuidanceEnabled(
  organizationId: string,
): Promise<boolean> {
  if (isGuidanceHardOff()) return false;
  const row = await prisma.organizationFeatureFlag.findUnique({
    where: {
      organizationId_key: {
        organizationId,
        key: GUIDANCE_FEATURE_FLAG_KEY,
      },
    },
    select: { enabled: true },
  });
  return resolveGuidanceFlag({
    hardOff: false,
    orgFlagEnabled: row?.enabled ?? null,
  });
}
