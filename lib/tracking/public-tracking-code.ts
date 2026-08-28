import { randomBytes } from "node:crypto";
import { todayJalaliInTehran } from "@/lib/datetime/jalali";

/** ST-{jalaliYear}-{5 alnum uppercase} e.g. ST-1405-8F2K9 */
export function generatePublicTrackingCode(now = new Date()): string {
  const { jy } = todayJalaliInTehran(now);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  const bytes = randomBytes(5);
  let suffix = "";
  for (let i = 0; i < 5; i++) suffix += alphabet[bytes[i]! % alphabet.length];
  return `ST-${jy}-${suffix}`;
}

/**
 * Allocate a public tracking code that does not already exist for the org.
 * `exists` should be scoped to the caller's organization (and optionally tx).
 */
export async function allocateUniqueTrackingCode(params: {
  organizationId: string;
  exists: (code: string) => Promise<boolean>;
  maxAttempts?: number;
}): Promise<string> {
  const maxAttempts = params.maxAttempts ?? 8;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generatePublicTrackingCode();
    if (!(await params.exists(code))) {
      return code;
    }
  }
  throw new Error("TRACKING_CODE_ALLOCATION_FAILED");
}
