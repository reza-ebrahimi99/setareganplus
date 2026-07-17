import { NextResponse } from "next/server";
import { hasPermission, scopedBranchWhere } from "@/lib/auth/permissions";
import { requireAdminSessionOrThrow } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  let session: Awaited<ReturnType<typeof requireAdminSessionOrThrow>>;
  try {
    session = await requireAdminSessionOrThrow();
  } catch {
    return NextResponse.json(
      { error: "برای دریافت گزارش باید وارد شوید." },
      { status: 401 },
    );
  }
  if (!hasPermission(session, "crm.import_leads")) {
    return NextResponse.json(
      { error: "اجازه دریافت گزارش ورود CRM را ندارید." },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const canViewAll = hasPermission(session, "crm.view_all");
  const report = await prisma.crmLeadImportReport.findFirst({
    where: {
      id,
      organizationId: session.organization.id,
      ...scopedBranchWhere(session),
      ...(canViewAll ? {} : { importedByUserId: session.user.id }),
    },
    select: { resultCsv: true, createdAt: true },
  });
  if (!report) {
    return NextResponse.json(
      { error: "گزارش ورود پیدا نشد." },
      { status: 404 },
    );
  }

  return new Response(report.resultCsv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="crm-import-${report.createdAt.toISOString().slice(0, 10)}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
