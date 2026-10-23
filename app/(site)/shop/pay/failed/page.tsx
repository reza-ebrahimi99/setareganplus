import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatToman } from "@/lib/shop/config";
import { fa } from "@/lib/format";
import { retryPayment } from "../../actions";
import { ticketPath } from "@/lib/shop/orders";

export const metadata: Metadata = { title: "پرداخت ناموفق", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Failed({ searchParams }: { searchParams: Promise<{ o?: string; m?: string; pending?: string; t?: string }> }) {
  const sp = await searchParams;
  const order = sp.o ? await prisma.order.findUnique({ where: { qrToken: sp.o }, include: { items: true } }) : null;
  const pending = sp.pending === "1";
  if (order?.payStatus === "PAID") {
    return (
      <section className="container-x max-w-xl py-16 text-center">
        <p className="text-lg font-bold text-navy">این سفارش پرداخت شده است.</p>
        <Link href={ticketPath(order.qrToken)} className="btn-gold mt-6">مشاهده رسید و کد تحویل</Link>
      </section>
    );
  }
  return (
    <section className="container-x max-w-xl py-12 sm:py-16">
      <div className="card overflow-hidden">
        <div className={`px-6 py-8 text-center ${pending ? "bg-gold/15" : "bg-gc-soft"}`}>
          <span className={`mx-auto flex size-14 items-center justify-center rounded-full text-2xl font-black text-white ${pending ? "bg-gold" : "bg-gc"}`}>{pending ? "!" : "×"}</span>
          <h1 className="mt-4 text-xl font-extrabold text-navy">{pending ? "پرداخت در حال بررسی است" : "پرداخت انجام نشد"}</h1>
          <p className="mt-2 text-sm leading-7 text-ink/80">{sp.m || "پرداخت لغو شد یا تأیید نشد."}</p>
        </div>
        <div className="space-y-4 p-6">
          {order && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted">شماره سفارش</dt><dd className="font-bold text-navy" dir="ltr">{fa(order.number)}</dd></div>
              <div><dt className="text-xs text-muted">مبلغ</dt><dd className="font-bold text-navy">{formatToman(order.totalRials)}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-muted">جزوه</dt><dd className="font-semibold">{order.items.map((i) => i.title).join("، ")}</dd></div>
            </dl>
          )}
          {pending && sp.t ? (
            <a href={`/shop/pay/callback?token=${encodeURIComponent(sp.t)}`} className="btn-gold w-full">بررسی دوباره پرداخت</a>
          ) : order && order.stage !== "CANCELLED" ? (
            <form action={retryPayment}>
              <input type="hidden" name="o" value={order.qrToken} />
              <button className="btn-gold w-full">تلاش دوباره برای پرداخت</button>
            </form>
          ) : null}
          <p className="text-center text-xs leading-6 text-muted">اگر مبلغی از حساب شما کسر شده و سفارش پرداخت‌نشده مانده، نگران نباشید: بانک ظرف ۷۲ ساعت آن را برمی‌گرداند. برای پیگیری با ما <Link href="/contact" className="font-semibold text-edu">تماس بگیرید</Link>.</p>
          <Link href="/shop" className="btn-ghost w-full">بازگشت به فروشگاه</Link>
        </div>
      </div>
    </section>
  );
}
