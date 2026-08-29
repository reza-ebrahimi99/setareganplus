import { NextResponse } from "next/server";
import { requireAdminSessionOrThrow } from "@/lib/auth/require-admin";
import {
  FORM_QR_DOWNLOAD_SIZE,
  FORM_QR_PREVIEW_SIZE,
  generateFormQrPng,
} from "@/lib/forms/generate-form-qr";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Downloads a server-generated QR PNG for the form's public production URL.
 * Requires an authenticated admin session.
 */
export async function GET(request: Request, context: RouteContext) {
  let session: Awaited<ReturnType<typeof requireAdminSessionOrThrow>>;
  try {
    session = await requireAdminSessionOrThrow();
  } catch {
    return NextResponse.json(
      { error: "برای دریافت QR باید وارد شوید." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const url = new URL(request.url);
  const isPreview = url.searchParams.get("preview") === "1";

  try {
    const form = await prisma.form.findFirst({
      where: {
        id,
        organizationId: session.organization.id,
        deletedAt: null,
      },
      select: {
        slug: true,
        publishedVersionId: true,
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: "فرم مورد نظر یافت نشد." },
        { status: 404 },
      );
    }

    if (!form.publishedVersionId) {
      return NextResponse.json(
        { error: "فقط فرم‌های منتشرشده QR دارند." },
        { status: 409 },
      );
    }

    const size = isPreview ? FORM_QR_PREVIEW_SIZE : FORM_QR_DOWNLOAD_SIZE;
    const png = await generateFormQrPng(form.slug, size);
    const filename = `form-${form.slug}-qr.png`;

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": isPreview
          ? "inline"
          : `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "ساخت QR در حال حاضر ممکن نیست." },
      { status: 503 },
    );
  }
}
