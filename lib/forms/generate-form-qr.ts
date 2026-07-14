import QRCode from "qrcode";
import { getPublicFormUrl } from "@/lib/forms/public-form-url";

export const FORM_QR_DOWNLOAD_SIZE = 1024;
export const FORM_QR_PREVIEW_SIZE = 220;

/**
 * Server-side QR PNG for a published form public URL.
 * High error correction, white background, no watermark.
 */
export async function generateFormQrPng(
  slug: string,
  size: number = FORM_QR_DOWNLOAD_SIZE,
): Promise<Buffer> {
  const url = getPublicFormUrl(slug);
  const safeSize = Math.min(2048, Math.max(128, Math.floor(size)));

  return QRCode.toBuffer(url, {
    type: "png",
    width: safeSize,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}

export async function generateFormQrDataUrl(
  slug: string,
  size: number = FORM_QR_PREVIEW_SIZE,
): Promise<string> {
  const url = getPublicFormUrl(slug);
  const safeSize = Math.min(2048, Math.max(128, Math.floor(size)));

  return QRCode.toDataURL(url, {
    type: "image/png",
    width: safeSize,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}
