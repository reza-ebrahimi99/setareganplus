import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { absolutePathForStorageKey } from "@/lib/media/storage";
import { requirePortalContext } from "@/lib/portal/auth";
import {
  canViewerAccessExperienceFile,
  guardianFileAccessFlags,
} from "@/lib/sxp/engine/file-visibility";
import { assertSxpFilesEnabledOrNotFound } from "@/lib/sxp/hub/require";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, routeContext: RouteContext) {
  const context = await requirePortalContext();
  await assertSxpFilesEnabledOrNotFound(context.organization.id);
  const { id } = await routeContext.params;

  const file = await prisma.experienceFile.findFirst({
    where: {
      id,
      organizationId: context.organization.id,
      userId: context.user.id,
    },
  });
  if (!file) notFound();

  const flags = guardianFileAccessFlags(context.authorizedStudents);
  const allowed = canViewerAccessExperienceFile({
    ownerUserId: file.userId,
    viewerUserId: context.user.id,
    visibility: file.visibility,
    kind: file.kind,
    accountType: context.activeLink.accountType,
    canViewCertificates: flags.canViewCertificates,
    canViewAcademicData: flags.canViewAcademicData,
  });
  if (!allowed) notFound();

  if (!file.mediaStorageKey) {
    return new NextResponse("فایل هنوز آماده نیست.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const absolutePath = absolutePathForStorageKey(file.mediaStorageKey);
    await stat(absolutePath);
    const stream = Readable.toWeb(createReadStream(absolutePath)) as ReadableStream<Uint8Array>;
    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": file.mime ?? "application/octet-stream",
        "Content-Disposition": 'attachment; filename="download"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("فایل هنوز آماده نیست.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
