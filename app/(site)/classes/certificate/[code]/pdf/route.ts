import { prisma } from "@/lib/prisma";
import { certificatePdf } from "@/lib/classes/certificate";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const row = await prisma.classCertificate.findUnique({ where: { code }, include: { student: true, course: true } });
  if (!row) return new Response("Not found", { status: 404 });
  const pdf = await certificatePdf(row);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificate-${row.code}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
