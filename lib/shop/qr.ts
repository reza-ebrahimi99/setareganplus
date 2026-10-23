import "server-only";
import QRCode from "qrcode";
import { siteUrl } from "./config";

export const ticketUrl = (qrToken: string) => `${siteUrl()}/booklet/${encodeURIComponent(qrToken)}`;

/** Black-on-white SVG with a proper quiet zone (phones scan it reliably, prints crisply). */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 4, errorCorrectionLevel: "Q", color: { dark: "#000000", light: "#ffffff" } });
}
