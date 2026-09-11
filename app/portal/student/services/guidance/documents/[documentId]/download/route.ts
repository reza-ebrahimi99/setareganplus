import { notFound } from "next/navigation";
import { promises as fs } from "node:fs";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import { loadGuidanceV2Plan } from "@/lib/guidance/journey-v2/plan";
import { absolutePathForStorageKey } from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ documentId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) notFound();

  const plan = await loadGuidanceV2Plan({
    organizationId: context.organization.id,
    studentId,
  });
  if (!plan || plan.userId !== context.user.id) notFound();

  const { documentId } = await params;
  const doc = await prisma.guidanceDocument.findFirst({
    where: {
      id: documentId,
      organizationId: context.organization.id,
      planId: plan.id,
      deletedAt: null,
    },
    select: {
      originalFilename: true,
      mimeType: true,
      mediaAsset: { select: { storageKey: true, deletedAt: true } },
    },
  });
  if (!doc?.mediaAsset || doc.mediaAsset.deletedAt) notFound();

  const absolute = absolutePathForStorageKey(doc.mediaAsset.storageKey);
  let data: Buffer;
  try {
    data = await fs.readFile(absolute);
  } catch {
    notFound();
  }

  const filename = doc.originalFilename.replace(/[^\w.\u0600-\u06FF-]+/g, "_");
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
