import { randomInt } from "node:crypto";

/**
 * Human-facing tracking code: SP-BKG-YYMMDD-XXXX (Latin; displayed with Persian digits in UI).
 */
export function generateTrackingCode(now = new Date()): string {
  const y = String(now.getUTCFullYear()).slice(-2);
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const suffix = String(randomInt(0, 10000)).padStart(4, "0");
  return `SP-BKG-${y}${m}${d}-${suffix}`;
}
