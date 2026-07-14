import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdvisorRuleForms, ServiceSettingsForm } from "@/components/admin/bookings/BookingForms";
import { adminBreadcrumbs } from "@/content/admin";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { toPersianDigits } from "@/lib/persian";

export default async function BookingServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdminSession();
  const service = await prisma.bookingService.findFirst({
    where: { id, organizationId: session.organization.id, deletedAt: null },
    include: { advisorLinks: { include: { advisor: { select: { id: true, displayName: true } } } }, availabilityRules: { orderBy: [{ weekday: "asc" }, { startLocalTime: "asc" }] } },
  });
  if (!service) notFound();
  const advisors = service.advisorLinks.map(({ advisor }) => advisor);
  const weekdays = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
  return <><AdminPageHeader title={service.title} description="تنظیمات، مشاوران و دسترسی زمانی خدمت" breadcrumbs={adminBreadcrumbs.bookingServiceDetail} compact />
    <div className="mb-5 flex flex-wrap gap-3"><Link href={`/book/${service.slug}`} target="_blank" className="rounded-xl border border-border px-4 py-2 text-sm">مشاهده صفحه عمومی</Link><Link href="/admin/bookings/services" className="rounded-xl border border-border px-4 py-2 text-sm">بازگشت به خدمت‌ها</Link></div>
    <div className="space-y-6"><ServiceSettingsForm service={service} />
      <section className="admin-card p-5"><h2 className="font-semibold text-primary">قواعد ثبت‌شده</h2>{service.availabilityRules.length ? <ul className="mt-3 space-y-2 text-sm text-muted">{service.availabilityRules.map((rule) => <li key={rule.id}>{weekdays[rule.weekday]} · <span dir="ltr">{toPersianDigits(rule.startLocalTime)} تا {toPersianDigits(rule.endLocalTime)}</span> · ظرفیت {toPersianDigits(rule.slotCapacity)}</li>)}</ul> : <p className="mt-2 text-sm text-muted">هنوز قاعده‌ای ثبت نشده است.</p>}</section>
      <AdvisorRuleForms serviceId={service.id} advisors={advisors} />
    </div>
  </>;
}
