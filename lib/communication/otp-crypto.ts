/**
 * OTP code hashing — never store or log plaintext OTP.
 * Format: sha256$<saltHex>$<hashHex>
 */

import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { toLatinDigits } from "@/lib/forms/latin-digits";

const HASH_PREFIX = "sha256";

export function generateSecureOtpDigits(length = 6): string {
  const max = 10 ** length;
  const n = randomInt(0, max);
  return String(n).padStart(length, "0");
}

export function normalizeOtpInput(raw: string): string {
  return toLatinDigits(raw).replace(/\D/g, "");
}

export function hashOtpCode(code: string): string {
  const salt = randomBytes(16);
  const hash = createHash("sha256")
    .update(salt)
    .update(code)
    .digest();
  return `${HASH_PREFIX}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyOtpCode(code: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== HASH_PREFIX) {
    return false;
  }
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (salt.length === 0 || expected.length === 0) {
    return false;
  }
  const actual = createHash("sha256").update(salt).update(code).digest();
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}
