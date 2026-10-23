import type { Metadata } from "next";
import { lookupOrder } from "./actions";
import { LookupForm } from "./LookupForm";

export const metadata: Metadata = { title: "پیگیری سفارش جزوه", robots: { index: false } };

export default async function OrderLookup({ searchParams }: { searchParams: Promise<{ e?: string; nf?: string }> }) {
  const sp = await searchParams;
  return (
    <section className="container-x max-w-md py-12 sm:py-16">
      <h1 className="text-2xl font-extrabold text-navy">پیگیری سفارش جزوه</h1>
      <p className="mt-2 text-sm leading-7 text-muted">کد تحویل ۶ حرفی (در پیامک) یا شماره سفارش را همراه با شماره موبایلی که با آن خرید کرده‌اید وارد کنید.</p>
      <LookupForm action={lookupOrder} error={sp.e ?? (sp.nf ? "nf" : undefined)} />
    </section>
  );
}
