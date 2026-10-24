import { requirePerm } from "@/lib/auth";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageTitle, Panel } from "@/components/admin/ui";
import { formatToman, formatNum, STAGE, BRANCH_LABEL } from "@/lib/shop/config";
import { tehranDayStart } from "@/lib/shop/admin";
import { smsStatus } from "@/lib/shop/sms";
import { zibalConfigured } from "@/lib/shop/zibal";
import { getShopSettings } from "@/lib/shop/settings";
import { fa, jalaliDate, jalaliDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "فروش جزوه" };

const paidSince = (d: Date) => ({ payStatus: "PAID" as const, stage: { not: "CANCELLED" as const }, paidAt: { gte: d } });

export default async function ShopDashboard() {
  await requirePerm("shop.dashboard");
  const [t0, w0, m0, d14] = [tehranDayStart(0), tehranDayStart(6), tehranDayStart(29), tehranDayStart(13)];
  const sum = (d: Date) => prisma.order.aggregate({ where: paidSince(d), _sum: { totalRials: true }, _count: true });
  const [today, week, month, stageCounts, top, daily, recent, settings] = await Promise.all([
    sum(t0),
    sum(w0),
    sum(m0),
    prisma.order.groupBy({ by: ["stage"], where: { OR: [{ payStatus: "PAID" }, { stage: { not: "REGISTERED" } }] }, _count: true }),
    prisma.orderItem.groupBy({ by: ["title"], where: { order: paidSince(m0) }, _sum: { qty: true, totalRials: true }, orderBy: { _sum: { qty: "desc" } }, take: 6 }),
    prisma.$queryRaw<{ d: Date; rials: bigint; n: bigint }[]>`
      select date_trunc('day', "paidAt" + interval '210 minutes') as d, sum("totalRials")::bigint as rials, count(*)::bigint as n
      from "Order" where "payStatus" = 'PAID' and stage <> 'CANCELLED' and "paidAt" >= ${d14}
      group by 1 order by 1`,
    prisma.order.findMany({ where: { payStatus: "PAID" }, orderBy: { paidAt: "desc" }, take: 8, include: { items: true } }),
    getShopSettings(),
  ]);
  const sc = Object.fromEntries(stageCounts.map((s) => [s.stage, s._count])) as Record<string, number>;
  const days = Array.from({ length: 14 }, (_, i) => {
    const start = tehranDayStart(13 - i);
    const key = new Date(start.getTime() + 3.5 * 3_600_000).toISOString().slice(0, 10);
    const row = daily.find((r) => new Date(r.d).toISOString().slice(0, 10) === key);
    return { start, rials: Number(row?.rials ?? 0), n: Number(row?.n ?? 0) };
  });
  const max = Math.max(1, ...days.map((d) => d.rials));
  const smsAll = smsStatus();
  const smsBad = smsAll.filter((x) => !x.ok);
  const KIND: Record<string, string> = { purchase: "پیامک خرید", ready: "پیامک آماده‌بودن", admin: "پیامک مدیر" };
  const zibal = zibalConfigured();
  const topMax = Math.max(1, ...top.map((t) => t._sum.qty ?? 0));

  return (
    <>
      <PageTitle
        title="فروش جزوه"
        sub="خلاصهٔ فروش و کارهای امروز"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/shop/pickup" className="btn-ghost px-4 py-2 text-sm">تحویل حضوری</Link>
            <Link href="/admin/shop/orders/new" className="btn-ghost px-4 py-2 text-sm">+ سفارش دستی</Link>
            <Link href="/admin/shop/orders" className="btn-gold px-5 py-2 text-sm">سفارش‌ها</Link>
          </div>
        }
      />

      {(!zibal || smsBad.length > 0 || !settings.open) && (
        <div className="mb-5 space-y-2">
          {!settings.open && <Warn>فروشگاه بسته است و سفارش جدید پذیرفته نمی‌شود. <Link className="underline" href="/admin/shop/settings">تنظیمات</Link></Warn>}
          {!zibal && <Warn>درگاه زیبال تنظیم نشده است؛ پرداخت آنلاین غیرفعال است (ZIBAL_MERCHANT_ID).</Warn>}
          {smsBad.length > 0 && <Warn>پیامک کامل تنظیم نشده: {smsBad.map((x) => `${KIND[x.kind]} (${x.why})`).join("، ")}. سفارش‌ها ثبت می‌شوند ولی این پیامک‌ها ارسال نمی‌شوند.</Warn>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="فروش امروز" value={formatToman(today._sum.totalRials ?? 0)} sub={`${formatNum(today._count)} سفارش`} accent />
        <Stat label="۷ روز اخیر" value={formatToman(week._sum.totalRials ?? 0)} sub={`${formatNum(week._count)} سفارش`} />
        <Stat label="۳۰ روز اخیر" value={formatToman(month._sum.totalRials ?? 0)} sub={`${formatNum(month._count)} سفارش`} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["PAID", "IN_PRODUCTION", "READY", "DELIVERED"] as const).map((s) => (
          <Link key={s} href={`/admin/shop/orders?stage=${s}`} className="group rounded-2xl border border-line bg-paper p-4 transition hover:border-navy/30">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${STAGE[s].cls}`}><span className={`size-1.5 rounded-full ${STAGE[s].dot}`} />{STAGE[s].short}</span>
            <p className="mt-2 text-2xl font-extrabold text-navy">{formatNum(sc[s] ?? 0)}</p>
            <p className="text-xs text-muted group-hover:text-ink">{s === "PAID" ? "منتظر چاپ" : s === "IN_PRODUCTION" ? "در چاپخانه" : s === "READY" ? "منتظر مراجعه" : "تحویل‌شده"} ←</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Panel title="فروش ۱۴ روز اخیر" className="lg:col-span-3">
          <div className="flex h-44 items-end gap-1.5" dir="ltr">
            {days.map((d, i) => (
              <div key={i} className="group relative flex h-full flex-1 flex-col justify-end">
                <div className={`rounded-t-md ${i === 13 ? "bg-gold" : "bg-navy/80"} transition group-hover:bg-gold`} style={{ height: `${Math.max(2, (d.rials / max) * 100)}%` }} />
                <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-navy px-2 py-1 text-[11px] text-white group-hover:block" dir="rtl">
                  {jalaliDate(d.start)} · {formatToman(d.rials)} · {fa(d.n)} سفارش
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted"><span>{jalaliDate(days[0].start)}</span><span>امروز</span></div>
        </Panel>
        <Panel title="پرفروش‌ترین‌ها (۳۰ روز)" className="lg:col-span-2">
          {top.length === 0 ? <p className="text-sm text-muted">هنوز فروشی ثبت نشده است.</p> : (
            <ul className="space-y-3">
              {top.map((t) => (
                <li key={t.title}>
                  <div className="flex justify-between gap-3 text-sm"><span className="truncate font-semibold">{t.title}</span><span className="shrink-0 text-muted">{fa(t._sum.qty ?? 0)} عدد</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-line"><div className="h-full rounded-full bg-gold" style={{ width: `${((t._sum.qty ?? 0) / topMax) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="آخرین پرداخت‌ها" className="mt-6">
        {recent.length === 0 ? <p className="text-sm text-muted">هنوز پرداختی نیست.</p> : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-t border-line first:border-0">
                    <td className="px-2 py-2.5"><Link href={`/admin/shop/orders/${o.id}`} className="font-semibold text-navy hover:underline">{o.buyerName}</Link><div className="text-xs text-muted">{o.items.map((i) => i.title).join("، ")}</div></td>
                    <td className="px-2 py-2.5 text-xs text-muted">{BRANCH_LABEL[o.branch] ?? o.branch}</td>
                    <td className="px-2 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STAGE[o.stage].cls}`}>{STAGE[o.stage].short}</span></td>
                    <td className="px-2 py-2.5 font-semibold">{formatToman(o.totalRials)}</td>
                    <td className="px-2 py-2.5 text-xs text-muted">{o.paidAt ? jalaliDateTime(o.paidAt) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ${accent ? "bg-navy text-white" : "border border-line bg-paper"}`}>
      <p className={`text-sm ${accent ? "text-white/70" : "text-muted"}`}>{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${accent ? "text-gold" : "text-navy"}`}>{value}</p>
      <p className={`mt-1 text-xs ${accent ? "text-white/60" : "text-muted"}`}>{sub}</p>
    </div>
  );
}
function Warn({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">{children}</div>;
}
