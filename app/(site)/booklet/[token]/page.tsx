import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { branchInfo, formatToman, PICKUP_HOURS, STAGE, STAGES, PAY_METHOD } from "@/lib/shop/config";
import { qrSvg, ticketUrl } from "@/lib/shop/qr";
import { fa, jalaliDateTime } from "@/lib/format";
import { retryPayment } from "../../shop/actions";
import { PrintButton } from "@/components/shop/PrintButton";

export const metadata: Metadata = { title: "رسید و کد تحویل جزوه", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Ticket({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ paid?: string }> }) {
  const { token } = await params;
  const { paid } = await searchParams;
  const o = await prisma.order.findUnique({ where: { qrToken: decodeURIComponent(token) }, include: { items: true, payments: { where: { status: "PAID" }, orderBy: { paidAt: "desc" }, take: 1 } } });
  if (!o) notFound();
  const isPaid = o.payStatus === "PAID";
  const br = branchInfo(o.branch);
  const svg = isPaid ? await qrSvg(ticketUrl(o.qrToken)) : null;
  const idx = STAGES.indexOf(o.stage as (typeof STAGES)[number]);
  const ref = o.payments[0]?.refNumber;

  return (
    <section className="container-x max-w-3xl py-8 sm:py-12">
      {paid === "1" && isPaid && (
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 print:hidden">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white">✓</span>
          <div>
            <h1 className="text-lg font-extrabold text-emerald-800">پرداخت موفق بود؛ سفارش شما ثبت شد</h1>
            <p className="text-sm leading-7 text-emerald-900/80">رسید پیامک می‌شود. وقتی جزوه آماده شد پیامک «آماده تحویل» می‌گیرید. این صفحه را نگه دارید.</p>
          </div>
        </div>
      )}
      {o.stage === "DELIVERED" && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center font-bold text-emerald-800">✓ این جزوه {o.deliveredAt ? `در ${jalaliDateTime(o.deliveredAt)}` : ""} تحویل داده شد{o.deliveredTo ? ` (تحویل‌گیرنده: ${o.deliveredTo})` : ""}.</div>
      )}

      <div className="card overflow-hidden print:border-black">
        <div className="flex items-center justify-between gap-4 bg-navy px-6 py-5 text-white">
          <div>
            <p className="text-xs text-white/60">رسید سفارش جزوه · ستارگان پلاس</p>
            <p className="mt-1 text-xl font-extrabold">{o.items.map((i) => i.title).join("، ")}</p>
          </div>
          <span className={`chip shrink-0 ${STAGE[o.stage].cls}`}>{STAGE[o.stage].short}</span>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto]">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div><dt className="text-xs text-muted">دانش‌آموز</dt><dd className="font-bold text-navy">{o.buyerName}</dd></div>
            <div><dt className="text-xs text-muted">شماره سفارش</dt><dd className="font-bold text-navy" dir="ltr">{fa(o.number)}</dd></div>
            <div><dt className="text-xs text-muted">مبلغ</dt><dd className="font-bold text-navy">{formatToman(o.totalRials)}</dd></div>
            <div><dt className="text-xs text-muted">پرداخت</dt><dd className="font-semibold">{isPaid ? `${PAY_METHOD[o.payMethod] ?? o.payMethod}${ref ? ` · پیگیری ${fa(ref)}` : ""}` : "پرداخت نشده"}</dd></div>
            <div className="col-span-2"><dt className="text-xs text-muted">محل تحویل</dt><dd className="font-bold text-navy">{br.name}</dd><dd className="text-muted">{br.address}</dd></div>
            <div className="col-span-2"><dt className="text-xs text-muted">ساعت تحویل</dt><dd>{PICKUP_HOURS.join(" · ")}</dd></div>
            <div className="col-span-2"><dt className="text-xs text-muted">تاریخ ثبت</dt><dd>{jalaliDateTime(o.createdAt)}</dd></div>
          </dl>
          {svg ? (
            <div className="mx-auto text-center">
              <div className="w-48 rounded-xl border border-line bg-white p-1 sm:w-52 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
              <p className="mt-2 text-xs text-muted">کد تحویل</p>
              <p className="text-2xl font-black tracking-[0.25em] text-navy" dir="ltr">{o.shortCode}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-ivory p-5 text-center sm:w-56">
              <p className="text-sm font-semibold text-navy">کد تحویل پس از پرداخت فعال می‌شود.</p>
              {o.stage !== "CANCELLED" && (
                <form action={retryPayment} className="mt-3 w-full print:hidden">
                  <input type="hidden" name="o" value={o.qrToken} />
                  <button className="btn-gold w-full">پرداخت {formatToman(o.totalRials)}</button>
                </form>
              )}
            </div>
          )}
        </div>

        {o.stage !== "CANCELLED" && (
          <ol className="grid grid-cols-5 border-t border-line text-center text-[0.7rem] sm:text-xs">
            {STAGES.map((st, i) => (
              <li key={st} className={`px-1 py-3 ${i <= idx ? "font-bold text-navy" : "text-muted/70"}`}>
                <span className={`mx-auto mb-1.5 block size-2.5 rounded-full ${i <= idx ? STAGE[st].dot : "bg-line"}`} />
                {st === "REGISTERED" ? "ثبت" : STAGE[st].short}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
        <PrintButton />
        <Link href="/shop" className="btn-ghost">فروشگاه جزوه</Link>
      </div>
      <p className="mt-4 text-center text-xs leading-6 text-muted print:hidden">هنگام تحویل، این QR یا کد {o.shortCode} را به همکار شعبه نشان دهید. لینک کوتاه: <span dir="ltr">setareganplus.ir/o/{o.shortCode}</span></p>
    </section>
  );
}
