import { notFound } from "next/navigation";
import { promises as fs } from "node:fs";
import { CounselorAccessError, requireCounselorContext } from "@/lib/counselor-os/auth";
import { assertCounselorCanAccessStudent } from "@/lib/counselor-os/auth";
import { absolutePathForStorageKey } from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ studentId: string; documentId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const ctx = await requireCounselorContext();
  const { studentId, documentId } = await params;

  try {
    await assertCounselorCanAccessStudent({
      organizationId: ctx.organizationId,
      counselorUserId: ctx.userId,
      studentId,
      canReview: ctx.canReview,
    });
  } catch (e) {
    if (e instanceof CounselorAccessError) notFound();
    throw e;
  }

  const doc = await prisma.guidanceDocument.findFirst({
    where: {
      id: documentId,
      organizationId: ctx.organizationId,
      deletedAt: null,
      plan: { studentId, deletedAt: null },
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
