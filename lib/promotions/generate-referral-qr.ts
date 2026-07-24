/**
 * QR generation for REFERRAL promotion links (reuses qrcode package).
 */

import QRCode from "qrcode";
import { getPublicReferralWizardUrl } from "@/lib/promotions/referral-link";

export const REFERRAL_QR_DOWNLOAD_SIZE = 1024;
export const REFERRAL_QR_PREVIEW_SIZE = 220;

export async function generateReferralQrPng(params: {
  flowSlug: string;
  code: string;
  size?: number;
}): Promise<Buffer> {
  const url = getPublicReferralWizardUrl(params.flowSlug, params.code);
  const safeSize = Math.min(
    2048,
    Math.max(128, Math.floor(params.size ?? REFERRAL_QR_DOWNLOAD_SIZE)),
  );
  return QRCode.toBuffer(url, {
    type: "png",
    width: safeSize,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

export async function generateReferralQrDataUrl(params: {
  flowSlug: string;
  code: string;
  size?: number;
}): Promise<string> {
  const url = getPublicReferralWizardUrl(params.flowSlug, params.code);
  const safeSize = Math.min(
    2048,
    Math.max(128, Math.floor(params.size ?? REFERRAL_QR_PREVIEW_SIZE)),
  );
  return QRCode.toDataURL(url, {
    type: "image/png",
    width: safeSize,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}
