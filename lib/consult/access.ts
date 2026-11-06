import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { ACCESS_ALPHABET, ACCESS_CODE_LENGTH } from "./constants";

export function normalizeAccessCode(raw: string): string | null {
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[\s\-–—_]/g, "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if (cleaned.length !== ACCESS_CODE_LENGTH) return null;
  if ([...cleaned].some((ch) => !ACCESS_ALPHABET.includes(ch))) return null;
  return cleaned;
}

export function formatAccessCode(code: string): string {
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

/** HMAC so a database copy cannot be turned back into a code without SESSION_SECRET. */
export function hashAccessCode(code: string, secret: string): string {
  return createHmac("sha256", secret).update(`consult-student:v1:${code}`).digest("hex");
}

export function hashOtpCode(code: string, mobile: string, secret: string): string {
  return createHmac("sha256", secret).update(`consult-otp:v1:${mobile}:${code}`).digest("hex");
}

export function hashIp(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(`consult-ip:v1:${ip}`).digest("hex").slice(0, 32);
}

export function hashesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function generateAccessCode(): string {
  let out = "";
  for (let i = 0; i < ACCESS_CODE_LENGTH; i++) out += ACCESS_ALPHABET[randomInt(0, ACCESS_ALPHABET.length)];
  return out;
}

export function generateOtpCode(): string {
  return String(randomInt(10000, 100000));
}

export function generatePublicCode(): string {
  let out = "";
  for (let i = 0; i < 8; i++) out += ACCESS_ALPHABET[randomInt(0, ACCESS_ALPHABET.length)];
  return out;
}

/** `attemptsAlreadyRecorded` is the count before this try. */
export function rateDecision(attemptsAlreadyRecorded: number, max: number): "allow" | "block" {
  return attemptsAlreadyRecorded >= max ? "block" : "allow";
}

export const CODE_WINDOW_MS = 15 * 60_000;
export const CODE_WINDOW_MAX = 8;
export const CODE_HOUR_MS = 60 * 60_000;
export const CODE_HOUR_MAX = 20;

export function reminderDue(now: Date, startsAt: Date, hoursBefore: number, alreadySentForThisSlot: boolean): boolean {
  if (alreadySentForThisSlot) return false;
  if (!(hoursBefore > 0)) return false;
  const lead = hoursBefore * 3_600_000;
  const t = startsAt.getTime();
  return t > now.getTime() && t <= now.getTime() + lead;
}
