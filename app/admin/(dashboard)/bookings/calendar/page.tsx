import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import { jalaliMonthLength, jalaliTehranLocalToUtc, PERSIAN_MONTHS, todayJalaliInTehran, utcToJalaliInTehran } from "@/lib/datetime/jalali";
import { getPersianWeekdayIndex } from "@/lib/datetime/tehran-zone";
import { prisma } from "@/lib/prisma";
import { toPersianDigits } from "@/lib/persian";

type Props = { searchParams: Promise<{ y?: string; m?: string; day?: string; service?: string; advisor?: string; status?: string }> };
const statusLabels: Record<string, string> = { PENDING: "در انتظار", CONFIRMED: "تأییدشده", WAITING_LIST: "لیست انتظار", CANCELLED: "لغوشده", COMPLETED: "تکمیل‌شده", NO_SHOW: "عدم مراجعه", RESCHEDULED: "جابجا شده" };

export default async function BookingCalendarPage({ searchParams }: Props) {
  const query = await searchParams; const session = await requirePermission("booking.view_all"); const today = todayJalaliInTehran();
  const y = Number(query.y) || today.jy; const m = Math.min(12, Math.max(1, Number(query.m) || today.jm));
  const start = jalaliTehranLocalToUtc(y, m, 1, 0, 0); const end = m === 12 ? jalaliTehranLocalToUtc(y + 1, 1, 1, 0, 0) : jalaliTehranLocalToUtc(y, m + 1, 1, 0, 0);
  const slots = await prisma.bookingSlot.findMany({
    where: { organizationId: session.organization.id, startsAt: { gte: start, lt: end }, ...(session.membership.allBranches ? {} : { branchId: { in: session.membership.branchIds } }), ...(query.service ? { serviceId: query.service } : {}), ...(query.advisor ? { advisorId: query.advisor } : {}) },
    include: { service: { select: { title: true } }, advisor: { select: { displayName: true } }, reservations: { where: query.status ? { status: query.status as never } : { deletedAt: null }, select: { id: true, firstName: true, lastName: true, status: true, trackingCode: true } } },
    orderBy: { startsAt: "asc" },
  });
  const services = await prisma.bookingService.findMany({ where: { organizationId: session.organization.id, deletedAt: null, ...(session.membership.allBranches ? {} : { branchId: { in: session.membership.branchIds } }) }, select: { id: true, title: true } });
  const advisors = await prisma.bookingAdvisor.findMany({ where: { organizationId: session.organization.id, deletedAt: null, ...(session.membership.allBranches ? {} : { branchId: { in: session.membership.branchIds } }) }, select: { id: true, displayName: true } });
  const selectedDay = Number(query.day); const selected = selectedDay >= 1 && selectedDay <= jalaliMonthLength(y, m) ? selectedDay : null;
  const byDay = new Map<number, typeof slots>(); for (const slot of slots) { const day = utcToJalaliInTehran(slot.startsAt).jd; byDay.set(day, [...(byDay.get(day) ?? []), slot]); }
  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }; const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  const params = new URLSearchParams(); if (query.service) params.set("service", query.service); if (query.advisor) params.set("advisor", query.advisor); if (query.status) params.set("status", query.status);
  const link = (values: Record<string, string | number>) => { const p = new URLSearchParams(params); Object.entries(values).forEach(([k,v]) => p.set(k, String(v))); return `/admin/bookings/calendar?${p}`; };
  const leading = getPersianWeekdayIndex(jalaliTehranLocalToUtc(y, m, 1, 12, 0));
  const reservationsAll = selected ? (byDay.get(selected) ?? []).flatMap((slot) => slot.reservations.map((reservation) => ({ reservation, slot }))) : [];
  const reservations = reservationsAll.slice(0, 100);
  return <><AdminPageHeader title="تقویم نوبت‌ها" description="نمایش نوبت‌های ماه جاری و رزروهای هر روز" breadcrumbs={adminBreadcrumbs.bookingCalendar} compact />
    <form className="admin-card mb-5 grid gap-3 p-4 sm:grid-cols-4"><input type="hidden" name="y" value={y}/><input type="hidden" name="m" value={m}/><select name="service" defaultValue={query.service} className="rounded-xl border border-border px-3 py-2 text-sm"><option value="">همه خدمت‌ها</option>{services.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select><select name="advisor" defaultValue={query.advisor} className="rounded-xl border border-border px-3 py-2 text-sm"><option value="">همه مشاوران</option>{advisors.map(a=><option key={a.id} value={a.id}>{a.displayName}</option>)}</select><select name="status" defaultValue={query.status} className="rounded-xl border border-border px-3 py-2 text-sm"><option value="">همه وضعیت‌ها</option>{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><button className="rounded-xl bg-primary px-4 py-2 text-sm text-white">اعمال فیلتر</button></form>
    <section className="admin-card p-4"><div className="mb-4 flex items-center justify-between"><Link href={link(prev)} className="rounded-lg border border-border px-3 py-1">ماه قبل</Link><h2 className="font-semibold text-primary">{PERSIAN_MONTHS[m - 1]} {toPersianDigits(y)}</h2><Link href={link(next)} className="rounded-lg border border-border px-3 py-1">ماه بعد</Link></div><div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">{["ش","ی","د","س","چ","پ","ج"].map(d=><div key={d}>{d}</div>)}</div><div className="mt-1 grid grid-cols-7 gap-1">{Array.from({ length: leading }).map((_,i)=><div key={`empty${i}`} />)}{Array.from({ length: jalaliMonthLength(y,m) },(_,i)=>{ const day=i+1; const count=byDay.get(day)?.length ?? 0; return <Link key={day} href={link({ y,m,day })} className={`min-h-16 rounded-xl border p-2 text-sm ${selected===day ? "border-secondary bg-secondary/10" : "border-border hover:bg-background"}`}><span>{toPersianDigits(day)}</span>{count ? <span className="mt-2 block text-xs text-secondary">{toPersianDigits(count)} نوبت</span>:null}</Link>})}</div></section>
    {selected ? <section className="admin-card mt-5 p-5"><h2 className="font-semibold text-primary">رزروهای {toPersianDigits(selected)} {PERSIAN_MONTHS[m - 1]}</h2>{reservations.length ? <><ul className="mt-3 space-y-2">{reservations.map(({reservation,slot})=><li key={reservation.id} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 text-sm"><span>{reservation.firstName} {reservation.lastName} · {slot.service.title} · {slot.advisor.displayName}</span><Link className="text-secondary" href={`/admin/bookings/reservations/${reservation.id}`}>{statusLabels[reservation.status]} · {toPersianDigits(reservation.trackingCode)}</Link></li>)}</ul>{reservationsAll.length > reservations.length ? <p className="mt-3 text-xs text-muted">نمایش {toPersianDigits(reservations.length)} مورد از {toPersianDigits(reservationsAll.length)} — برای فهرست کامل فیلتر وضعیت را دقیق‌تر کنید.</p> : null}</>:<p className="mt-2 text-sm text-muted">رزروی در این روز ثبت نشده است.</p>}</section>:null}
  </>;
}
