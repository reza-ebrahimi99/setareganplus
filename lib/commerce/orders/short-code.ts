/**
 * Server-only generator for the permanent order short code (`shortCode`).
 * Uses `node:crypto` — must never be imported from a client component.
 * Kept out of `qr.ts` so client components (e.g. QR thumbnails, admin
 * quick links) can keep importing path/URL helpers from there safely.
 */

import { randomInt } from "node:crypto";
import {
  COMMERCE_SHORT_CODE_ALPHABET,
  COMMERCE_SHORT_CODE_LENGTH,
} from "@/lib/commerce/orders/qr";

/** Permanent short code payload for an order's public tracking short link. */
export function generateCommerceOrderShortCode(
  length: number = COMMERCE_SHORT_CODE_LENGTH,
): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += COMMERCE_SHORT_CODE_ALPHABET[randomInt(COMMERCE_SHORT_CODE_ALPHABET.length)];
  }
  return code;
}
