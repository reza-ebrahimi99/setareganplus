import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-admin";
import { buildBookPosImportTemplate } from "@/lib/commerce/pos/import-template";

export const dynamic = "force-dynamic";

export async function GET() {
  await requirePermission("commerce.products.manage");
  const buffer = await buildBookPosImportTemplate();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("قالب-ورود-کتاب.xlsx")}`,
      "Cache-Control": "private, no-store",
    },
  });
}
