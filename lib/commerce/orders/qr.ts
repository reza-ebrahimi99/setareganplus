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
  return `/booklet/${encodeURIComponent(token)}`;
}

export function commerceOrderQrUrl(token: string): string {
  return `${PUBLIC_SITE_ORIGIN}${commerceOrderQrPath(token)}`;
}

/** Stable student receipt URL — same canonical booklet ticket as the QR payload. */
export function commerceOrderReceiptPath(token: string): string {
  return commerceOrderQrPath(token);
}

export function commerceOrderReceiptUrl(token: string): string {
  return commerceOrderQrUrl(token);
}

export function commerceOrderPublicQrImagePath(token: string): string {
  return `/booklet/${encodeURIComponent(token)}/qr`;
}

export function commerceOrderQrImagePath(token: string): string {
  return `/admin/commerce/orders/qr/${encodeURIComponent(token)}`;
}

export function commerceOrderAdminPickupPath(token: string): string {
  return `/admin/commerce/pickup/${encodeURIComponent(token)}`;
}

// ─── Public order tracking (short link + tracking page) ────────────────────
//
// The pickup receipt above (`/booklet/{qrToken}`) stays untouched. Public
// order tracking is a separate, additive surface: a short permanent link
// that every SMS and QR uses, redirecting to a full status page keyed by
// the order number.

/**
 * Uppercase alphanumeric — e.g. `AB12CD` (matches the public short-link
 * format). The generator lives in `short-code.ts` (needs `node:crypto`,
 * server-only); this file stays import-safe for client components.
 */
export const COMMERCE_SHORT_CODE_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const COMMERCE_SHORT_CODE_LENGTH = 6;

export function isCommerceShortCode(value: string | null | undefined): boolean {
  return typeof value === "string" && new RegExp(
    `^[${COMMERCE_SHORT_CODE_ALPHABET}]{${COMMERCE_SHORT_CODE_LENGTH},12}$`,
  ).test(value.trim().toUpperCase());
}

/** `/o/{shortCode}` — the permanent short link. QR and SMS always use this. */
export function commerceOrderShortPath(shortCode: string): string {
  return `/o/${encodeURIComponent(shortCode.trim().toUpperCase())}`;
}

export function commerceOrderShortUrl(shortCode: string): string {
  return `${PUBLIC_SITE_ORIGIN}${commerceOrderShortPath(shortCode)}`;
}

/** `/order/{orderNumber}` — the public tracking page the short link resolves to. */
export function commerceOrderTrackingPath(orderNumber: string): string {
  return `/order/${encodeURIComponent(orderNumber)}`;
}

export function commerceOrderTrackingUrl(orderNumber: string): string {
  return `${PUBLIC_SITE_ORIGIN}${commerceOrderTrackingPath(orderNumber)}`;
}

/**
 * Extract the existing qrToken from a scanned URL, path, or raw token.
 * Never treats student fields as QR payload.
 */
export function parseCommerceOrderQrInput(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  const fromPath = (path: string): string | null => {
    const match =
      /\/booklet\/([^/?#]+)/i.exec(path) ??
      /\/admin\/commerce\/pickup\/([^/?#]+)/i.exec(path);
    if (!match?.[1]) return null;
    if (match[1] === "qr") return null;
    try {
      const token = decodeURIComponent(match[1]).trim();
      if (!token || token === "qr") return null;
      return token;
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

/** Shared renderer — every commerce QR (pickup or short link) goes through this. */
async function generateQrPngForPayload(payload: string, size: number): Promise<Buffer> {
  return QRCode.toBuffer(payload, {
    type: "png",
    width: clampQrSize(size),
    ...QR_RENDER,
  });
}

async function generateQrDataUrlForPayload(payload: string, size: number): Promise<string> {
  return QRCode.toDataURL(payload, {
    type: "image/png",
    width: clampQrSize(size),
    ...QR_RENDER,
  });
}

export async function generateCommerceOrderQrPng(
  token: string,
  size = COMMERCE_QR_DOWNLOAD_SIZE,
): Promise<Buffer> {
  return generateQrPngForPayload(commerceOrderQrUrl(token), size);
}

export async function generateCommerceOrderQrDataUrl(
  token: string,
  size = COMMERCE_QR_PREVIEW_SIZE,
): Promise<string> {
  return generateQrDataUrlForPayload(commerceOrderQrUrl(token), size);
}

/** QR for the public tracking page — always encodes the short link, never qrToken. */
export async function generateCommerceOrderShortQrPng(
  shortCode: string,
  size = COMMERCE_QR_DOWNLOAD_SIZE,
): Promise<Buffer> {
  return generateQrPngForPayload(commerceOrderShortUrl(shortCode), size);
}

export async function generateCommerceOrderShortQrDataUrl(
  shortCode: string,
  size = COMMERCE_QR_PREVIEW_SIZE,
): Promise<string> {
  return generateQrDataUrlForPayload(commerceOrderShortUrl(shortCode), size);
}
