import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permissions";
import { requireAdminSessionOrThrow } from "@/lib/auth/require-admin";
import { isFormFileUploadMetadata } from "@/lib/media/form-file-upload";
import { absolutePathForStorageKey } from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ mediaId: string }>;
};

function contentDisposition(originalName: string): string {
  const asciiFallback =
    originalName
      .replace(/[^\x20-\x7E]+/g, "_")
      .replace(/["\\]/g, "_")
      .slice(0, 180) || "download";
  const encoded = encodeURIComponent(originalName);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

/**
 * Authorized download for registration FILE_UPLOAD MediaAssets.
 * Requires forms.manage; never exposes a public /media URL.
 */
export async function GET(_request: Request, context: RouteContext) {
  let session;
  try {
    session = await requireAdminSessionOrThrow();
  } catch {
    return NextResponse.json(
      { error: "برای دریافت فایل باید وارد شوید." },
      { status: 401 },
    );
  }

  if (!hasPermission(session, "forms.manage")) {
    return NextResponse.json(
      { error: "دسترسی به این فایل مجاز نیست." },
      { status: 403 },
    );
  }

  const { mediaId } = await context.params;
  const trimmed = mediaId?.trim() ?? "";
  if (!trimmed) {
    return NextResponse.json({ error: "شناسه رسانه نامعتبر است." }, { status: 400 });
  }

  const asset = await prisma.mediaAsset.findFirst({
    where: {
      id: trimmed,
      organizationId: session.organization.id,
      deletedAt: null,
      status: "ACTIVE",
    },
    select: {
      id: true,
      storageKey: true,
      mimeType: true,
      originalName: true,
      metadata: true,
    },
  });

  if (!asset || !isFormFileUploadMetadata(asset.metadata)) {
    return NextResponse.json({ error: "فایل یافت نشد." }, { status: 404 });
  }

  try {
    const absolutePath = absolutePathForStorageKey(asset.storageKey);
    const data = await fs.readFile(absolutePath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Disposition": contentDisposition(asset.originalName),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "خواندن فایل ممکن نشد." },
      { status: 404 },
    );
  }
}
