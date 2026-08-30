import { NextResponse } from "next/server";
import { AuditAction } from "@/generated/prisma/enums";
import { hasPermission } from "@/lib/auth/permissions";
import { requireAdminSessionOrThrow } from "@/lib/auth/require-admin";
import { exportBookingReservationsXlsx } from "@/lib/booking/reservation-export-xlsx";
import { parseBookingReservationExportFilters } from "@/lib/booking/reservation-export-filters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let session;
  try {
    session = await requireAdminSessionOrThrow();
  } catch {
    return NextResponse.json(
      { error: "برای دسترسی به این خروجی باید وارد شوید." },
      { status: 401 },
    );
  }

  if (!hasPermission(session, "booking.view_all")) {
    return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });
  }

  const url = new URL(request.url);
  const filters = parseBookingReservationExportFilters(url.searchParams);
  const allowedBranchIds = session.membership.allBranches
    ? null
    : session.membership.branchIds;

  const result = await exportBookingReservationsXlsx({
    organizationId: session.organization.id,
    allowedBranchIds,
    filters,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "خروجی Excel در حال حاضر در دسترس نیست." },
      { status: 503 },
    );
  }

  await prisma.auditLog
    .create({
      data: {
        organizationId: session.organization.id,
        actorUserId: session.user.id,
        action: AuditAction.DATA_EXPORTED,
        entityType: "BookingReservation",
        metadata: { format: "xlsx", filters },
      },
    })
    .catch((error) => console.error("[booking-export] audit log failed", error));

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
