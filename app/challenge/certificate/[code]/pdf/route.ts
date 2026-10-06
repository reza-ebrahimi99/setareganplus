import { NextResponse } from "next/server";
import {
  getPublicChallengeCertificate,
  renderChallengeCertificatePdf,
} from "@/lib/challenge/certificate";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const certificate = await getPublicChallengeCertificate(code);
  if (!certificate) return NextResponse.json({ error: "گواهی پیدا نشد." }, { status: 404 });
  const pdf = await renderChallengeCertificatePdf(certificate);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificate-${certificate.verificationCode}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

