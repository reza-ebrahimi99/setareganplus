import { NextResponse } from "next/server";
import {
  getPublicChallengeCertificate,
  renderChallengeCertificatePng,
} from "@/lib/challenge/certificate";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const certificate = await getPublicChallengeCertificate(code);
  if (!certificate) return NextResponse.json({ error: "گواهی پیدا نشد." }, { status: 404 });
  const png = await renderChallengeCertificatePng(certificate);
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="certificate-${certificate.verificationCode}.png"`,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
