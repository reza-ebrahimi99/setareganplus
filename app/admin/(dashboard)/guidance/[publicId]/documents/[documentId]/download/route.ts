import { notFound } from "next/navigation";
import { promises as fs } from "node:fs";
import { requirePermission } from "@/lib/auth/require-admin";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { absolutePathForStorageKey } from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ publicId: string; documentId: string }>;
};

/**
 * Auth-gated private download for guidance final-grades documents.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const session = await requirePermission("guidance.view");
  const enabled = await isGuidanceEnabled(session.organization.id);
  if (!enabled) notFound();

  const { publicId, documentId } = await params;

  const plan = await prisma.guidancePlan.findFirst({
    where: {
      organizationId: session.organization.id,
      publicId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!plan) notFound();

  const doc = await prisma.guidanceDocument.findFirst({
    where: {
      id: documentId,
      organizationId: session.organization.id,
      planId: plan.id,
      deletedAt: null,
    },
    select: {
      originalFilename: true,
      mimeType: true,
      mediaAsset: {
        select: { storageKey: true, deletedAt: true },
      },
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
