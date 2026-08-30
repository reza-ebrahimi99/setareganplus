import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-admin";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { buildWorkspaceExcel } from "@/lib/guidance/workspace/exports/report";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ publicId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await requirePermission("guidance.view");
  const enabled = await isGuidanceEnabled(session.organization.id);
  if (!enabled) notFound();

  const { publicId } = await params;
  const result = await buildWorkspaceExcel({
    organizationId: session.organization.id,
    publicId,
  });
  if (!result) notFound();

  return new Response(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
