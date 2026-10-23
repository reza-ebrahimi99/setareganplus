import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { ticketUrl } from "@/lib/shop/qr";

export const dynamic = "force-dynamic";

/** PNG of the ticket QR (kept for links from the old site). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const o = await prisma.order.findUnique({ where: { qrToken: decodeURIComponent(token) }, select: { qrToken: true } });
  if (!o) return new Response("Not found", { status: 404 });
  const png = await QRCode.toBuffer(ticketUrl(o.qrToken), { margin: 4, errorCorrectionLevel: "Q", width: 640 });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" } });
}
