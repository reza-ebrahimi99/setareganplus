import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STAGE } from "@/lib/shop/config";
import { fa, jalaliDate } from "@/lib/format";
import { lookupOrder } from "../actions";
import { LookupForm } from "../LookupForm";

export const metadata: Metadata = { title: "وضعیت سفارش", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Old tracking URL /order/ORD-…: shows only the status; the full ticket needs the buyer's mobile. */
export default async function OrderStatus({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ e?: string }> }) {
  const number = decodeURIComponent((await params).number).trim().toUpperCase();
  const { e } = await searchParams;
  const o = await prisma.order.findUnique({ where: { number }, select: { number: true, stage: true, createdAt: true } });
  if (!o) notFound();
  return (
    <section className="container-x max-w-md py-12 sm:py-16">
      <p className="text-sm text-muted">سفارش <span dir="ltr">{fa(o.number)}</span> · {jalaliDate(o.createdAt)}</p>
      <h1 className="mt-2 text-2xl font-extrabold text-navy">وضعیت: <span className={`chip align-middle text-base ${STAGE[o.stage].cls}`}>{STAGE[o.stage].label}</span></h1>
      <p className="mt-4 text-sm leading-7 text-muted">برای دیدن رسید و QR تحویل، شماره موبایل خریدار را وارد کنید.</p>
      <LookupForm action={lookupOrder} error={e} code={o.number} back={`/order/${o.number}`} />
    </section>
  );
}
