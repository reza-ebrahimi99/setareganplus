/**
 * Order QR helpers — one token opens the pickup/ops screen.
 * Reuses the shared `qrcode` package (same as forms/booking).
 */

import QRCode from "qrcode";
import { PUBLIC_SITE_ORIGIN } from "@/lib/forms/public-form-url";

export function commerceOrderQrPath(token: string): string {
  return `/admin/commerce/pickup/${encodeURIComponent(token)}`;
}

export function commerceOrderQrUrl(token: string): string {
  return `${PUBLIC_SITE_ORIGIN}${commerceOrderQrPath(token)}`;
}

export function commerceOrderQrImagePath(token: string): string {
  return `/admin/commerce/orders/qr/${encodeURIComponent(token)}`;
}

/**
 * Extract the existing qrToken from a scanned URL, path, or raw token.
 * Never treats student fields as QR payload.
 */
export function parseCommerceOrderQrInput(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  const fromPath = (path: string): string | null => {
    const match = /\/admin\/commerce\/pickup\/([^/?#]+)/i.exec(path);
    if (!match?.[1]) return null;
    try {
      return decodeURIComponent(match[1]).trim() || null;
    } catch {
      return match[1].trim() || null;
    }
  };

  try {
    const url = new URL(value);
    const token = fromPath(url.pathname);
    if (token) return token;
  } catch {
    /* not an absolute URL */
  }

  const pathToken = fromPath(value);
  if (pathToken) return pathToken;

  if (/^[a-z0-9_-]{8,128}$/i.test(value)) return value;
  return null;
}

export async function generateCommerceOrderQrPng(
  token: string,
  size = 320,
): Promise<Buffer> {
  const safeSize = Math.min(1024, Math.max(96, Math.floor(size)));
  return QRCode.toBuffer(commerceOrderQrUrl(token), {
    type: "png",
    width: safeSize,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

export async function generateCommerceOrderQrDataUrl(
  token: string,
  size = 160,
): Promise<string> {
  const safeSize = Math.min(1024, Math.max(96, Math.floor(size)));
  return QRCode.toDataURL(commerceOrderQrUrl(token), {
    type: "image/png",
    width: safeSize,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}
