import QRCode from "qrcode";

/** Opaque check-in / tracking URL QR — never encode PII. */
export async function generateCheckInQrDataUrl(
  url: string,
  size = 280,
): Promise<string> {
  return QRCode.toDataURL(url, {
    type: "image/png",
    width: size,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}
