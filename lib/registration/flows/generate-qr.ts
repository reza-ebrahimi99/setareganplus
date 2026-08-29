import QRCode from "qrcode";
import { getPublicRegistrationFlowUrl } from "@/lib/registration/flows/public-url";

export const REGISTRATION_FLOW_QR_DOWNLOAD_SIZE = 1024;
export const REGISTRATION_FLOW_QR_PREVIEW_SIZE = 220;

export async function generateRegistrationFlowQrPng(
  slug: string,
  size: number = REGISTRATION_FLOW_QR_DOWNLOAD_SIZE,
): Promise<Buffer> {
  const url = getPublicRegistrationFlowUrl(slug);
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

export async function generateRegistrationFlowQrDataUrl(
  slug: string,
  size: number = REGISTRATION_FLOW_QR_PREVIEW_SIZE,
): Promise<string> {
  const url = getPublicRegistrationFlowUrl(slug);
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
