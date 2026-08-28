import QRCode from "qrcode";

/** Opaque SXP_CARD token QR — never encode national ID or mobile. */
export async function generateSxpCardQrDataUrl(
  payload: string,
  size = 240,
): Promise<string> {
  return QRCode.toDataURL(payload, {
    type: "image/png",
    width: size,
    margin: 1,
    errorCorrectionLevel: "H",
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}
