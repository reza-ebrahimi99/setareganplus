import { createHash, randomBytes } from "node:crypto";

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildCheckInPath(token: string): string {
  return `/admin/bookings/check-in?token=${encodeURIComponent(token)}`;
}

export function buildPublicCheckInUrl(token: string): string {
  return `https://setareganplus.ir${buildCheckInPath(token)}`;
}
