import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ReservationActions } from "@/components/admin/bookings/ReservationActions";
import { adminBreadcrumbs } from "@/content/admin";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { formatJalaliDateTimeLabel } from "@/lib/datetime/jalali";
import { prisma } from "@/lib/prisma";
import { toPersianDigits } from "@/lib/persian";

const status: Record<string,string> = { PENDING:"در انتظار",CONFIRMED:"تأییدشده",WAITING_LIST:"لیست انتظار",CANCELLED:"لغوشده",RESCHEDULED:"جابجا شده",COMPLETED:"تکمیل‌شده",NO_SHOW:"عدم مراجعه" };
export default async function BookingReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const session = await requireAdminSession();
  const reservation = await prisma.bookingReservation.findFirst({ where: { id, organizationId: session.organization.id, deletedAt: null }, include: { slot: { include: { service: true, advisor: true } }, checkIns: true } });
  if (!reservation) notFound();
  return <><AdminPageHeader title="جزئیات رزرو" description={`کد پیگیری ${toPersianDigits(reservation.trackingCode)}`} breadcrumbs={adminBreadcrumbs.bookingReservation} compact />
    <div className="admin-card space-y-4 p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold text-primary">{reservation.firstName} {reservation.lastName}</h2><span className="rounded-full bg-background px-3 py-1 text-sm">{status[reservation.status]}</span></div><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted">خدمت</dt><dd>{reservation.slot.service.title}</dd></div><div><dt className="text-muted">مشاور</dt><dd>{reservation.slot.advisor.displayName}</dd></div><div><dt className="text-muted">زمان</dt><dd>{formatJalaliDateTimeLabel(reservation.slot.startsAt, reservation.slot.endsAt)}</dd></div><div><dt className="text-muted">موبایل</dt><dd dir="ltr">{toPersianDigits(reservation.normalizedMobile)}</dd></div><div><dt className="text-muted">نوع جلسه</dt><dd>{reservation.meetingType === "IN_PERSON" ? "حضوری" : reservation.meetingType === "ONLINE" ? "آنلاین" : "تلفنی"}</dd></div><div><dt className="text-muted">ورود</dt><dd>{reservation.checkedInAt ? "ثبت شده" : "ثبت نشده"}</dd></div></dl>{reservation.notes ? <p className="rounded-xl bg-background p-3 text-sm">{reservation.notes}</p> : null}<ReservationActions reservationId={reservation.id} waiting={reservation.status === "WAITING_LIST"} /></div>
  </>;
}
