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
