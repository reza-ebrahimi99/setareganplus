/**
 * Order QR helpers — one token opens the pickup/ops screen.
 * Reuses the shared `qrcode` package (same as forms/booking).
 *
 * Payload is always the production pickup URL (never PII, never a bare token).
 * Native iOS/Android cameras need a real quiet zone, square modules, and
 * black-on-white contrast — those live here, not in each UI surface.
 */

import QRCode from "qrcode";
import { PUBLIC_SITE_ORIGIN } from "@/lib/forms/public-form-url";

/** Quiet zone in modules. ISO 18004 minimum is 4; margin 1 is not camera-reliable. */
export const COMMERCE_QR_MARGIN = 4;
/** Level Q survives print/PDF scaling better than M without the bulk of H. */
export const COMMERCE_QR_ERROR_CORRECTION = "Q" as const;
export const COMMERCE_QR_DARK = "#000000";
export const COMMERCE_QR_LIGHT = "#ffffff";
export const COMMERCE_QR_MIN_SIZE = 256;
export const COMMERCE_QR_PREVIEW_SIZE = 256;
export const COMMERCE_QR_LABEL_SIZE = 320;
export const COMMERCE_QR_RECEIPT_SIZE = 512;
export const COMMERCE_QR_DOWNLOAD_SIZE = 640;

const QR_RENDER = {
  margin: COMMERCE_QR_MARGIN,
  errorCorrectionLevel: COMMERCE_QR_ERROR_CORRECTION,
  color: { dark: COMMERCE_QR_DARK, light: COMMERCE_QR_LIGHT },
} as const;

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

function clampQrSize(size: number): number {
  return Math.min(1024, Math.max(COMMERCE_QR_MIN_SIZE, Math.floor(size)));
}

export async function generateCommerceOrderQrPng(
  token: string,
  size = COMMERCE_QR_DOWNLOAD_SIZE,
): Promise<Buffer> {
  return QRCode.toBuffer(commerceOrderQrUrl(token), {
    type: "png",
    width: clampQrSize(size),
    ...QR_RENDER,
  });
}

export async function generateCommerceOrderQrDataUrl(
  token: string,
  size = COMMERCE_QR_PREVIEW_SIZE,
): Promise<string> {
  return QRCode.toDataURL(commerceOrderQrUrl(token), {
    type: "image/png",
    width: clampQrSize(size),
    ...QR_RENDER,
  });
}
