import { NextResponse } from "next/server";
import { GUIDANCE_FIRST_SESSION_SERVICE_SLUG } from "@/lib/guidance/journey/booking";
import {
  buildFirstSessionIcs,
  firstSessionIcsDescription,
} from "@/lib/guidance/office/first-session";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import { parseBookingServiceSettings } from "@/lib/booking/service-settings";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ serviceSlug: string; trackingCode: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { serviceSlug, trackingCode } = await params;
  if (serviceSlug !== GUIDANCE_FIRST_SESSION_SERVICE_SLUG) {
    return NextResponse.json({ error: "تقویم این خدمت در دسترس نیست." }, { status: 404 });
  }

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    return NextResponse.json({ error: "سازمان یافت نشد." }, { status: 404 });
  }

  const reservation = await prisma.bookingReservation.findFirst({
    where: {
      organizationId: organization.id,
      trackingCode: decodeURIComponent(trackingCode),
      deletedAt: null,
      slot: { service: { slug: serviceSlug } },
    },
    include: {
      slot: {
        include: {
          service: true,
          advisor: true,
          branch: true,
        },
      },
    },
  });

  if (!reservation) {
    return NextResponse.json({ error: "رزرو یافت نشد." }, { status: 404 });
  }

  const settings = parseBookingServiceSettings(reservation.slot.service.settings);
  const location =
    reservation.meetingType === "ONLINE"
      ? settings.onlineMeetingInfo ?? "جلسه آنلاین"
      : reservation.slot.branch?.name ?? settings.addressInfo ?? "حضوری";

  const ics = buildFirstSessionIcs({
    uid: `${reservation.id}@setareganplus.ir`,
    startsAt: reservation.slot.startsAt,
    endsAt: reservation.slot.endsAt,
    summary: `جلسه اول مشاوره — ${reservation.slot.advisor.displayName}`,
    description: firstSessionIcsDescription(),
    location,
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="guidance-first-session.ics"`,
    },
  });
}
