import type { Metadata } from "next";
import Link from "next/link";
import { listProducts, catalogFacets } from "@/lib/shop/catalog";
import { getShopSettings } from "@/lib/shop/settings";
import { CENTERS, GRADES, MAJORS } from "@/lib/shop/config";
import { fa } from "@/lib/format";
import { ProductCard } from "@/components/shop/ProductCard";
import { Eyebrow, Star } from "@/components/site/Star";

export const metadata: Metadata = {
  title: "فروشگاه جزوه",
  description: "خرید آنلاین جزوه‌های مدرسان ستارگان و قلم‌چی نسیم‌شهر؛ پرداخت امن و تحویل حضوری در شعبه.",
  alternates: { canonical: "/shop" },
};

type SP = { q?: string; grade?: string; major?: string; center?: string };

function chipHref(sp: SP, k: keyof SP, v?: string) {
  const p = new URLSearchParams(Object.entries({ ...sp, [k]: v }).filter(([, x]) => x) as [string, string][]);
  const s = p.toString();
  return s ? `/shop?${s}` : "/shop";
}

export default async function Shop({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [items, facets, settings] = await Promise.all([listProducts(sp), catalogFacets(), getShopSettings()]);
  const grades = GRADES.filter((g) => facets.grades.includes(g));
  const majors = MAJORS.filter((m) => facets.majors.includes(m));
  const centers = Object.keys(CENTERS).filter((c) => facets.centers.includes(c));
  const filtered = !!(sp.q || sp.grade || sp.major || sp.center);

  const Chips = ({ k, list, label }: { k: keyof SP; list: readonly string[]; label: (v: string) => string }) =>
    list.length === 0 ? null : (
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        <Link href={chipHref(sp, k)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${!sp[k] ? "border-navy bg-navy text-white" : "border-line bg-paper text-ink/80 hover:border-navy/30"}`}>همه</Link>
        {list.map((v) => (
          <Link key={v} href={chipHref(sp, k, v)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${sp[k] === v ? "border-navy bg-navy text-white" : "border-line bg-paper text-ink/80 hover:border-navy/30"}`}>{label(v)}</Link>
        ))}
      </div>
    );

  return (
    <>
      <section data-sp-lean-shop="" className="relative overflow-hidden bg-navy text-white">
        <Star filled={false} className="pointer-events-none absolute -top-20 -left-16 size-80 text-white/[0.06]" />
        <div className="container-x relative py-10 sm:py-14">
          <Eyebrow tone="light">فروشگاه جزوه</Eyebrow>
          <h1 className="mt-3 text-3xl leading-snug font-extrabold sm:text-4xl">جزوه‌های مدرسان ستارگان</h1>
          <p className="mt-3 max-w-2xl leading-8 text-white/75">آنلاین سفارش دهید، امن پرداخت کنید و جزوهٔ چاپ‌شده را در شعبهٔ دختران یا پسران قلم‌چی نسیم‌شهر تحویل بگیرید.</p>
          <form action="/shop" className="mt-6 flex max-w-xl gap-2">
            {sp.grade && <input type="hidden" name="grade" value={sp.grade} />}
            {sp.major && <input type="hidden" name="major" value={sp.major} />}
            {sp.center && <input type="hidden" name="center" value={sp.center} />}
            <input name="q" defaultValue={sp.q} placeholder="جست‌وجوی نام جزوه، درس یا مدرس…" className="input flex-1 border-white/20 bg-white text-ink" />
            <button className="btn-gold shrink-0 px-5">جست‌وجو</button>
          </form>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
            {["پرداخت امن زیبال", "پیامک آماده‌شدن سفارش", "تحویل حضوری با کد QR"].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><Star className="size-3 text-gold" />{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-x py-8 sm:py-10">
        {settings.notice && <p className="mb-6 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm leading-7 text-gold-ink">{settings.notice}</p>}
        <div className="mb-6 space-y-2.5">
          <Chips k="grade" list={grades} label={(v) => v} />
          <Chips k="major" list={majors} label={(v) => v} />
          <Chips k="center" list={centers} label={(v) => CENTERS[v]} />
        </div>
        <div className="mb-4 flex items-center justify-between text-sm text-muted">
          <span>{fa(items.length)} جزوه{sp.q ? ` برای «${sp.q}»` : ""}</span>
          {filtered && <Link href="/shop" className="font-semibold text-edu">حذف فیلترها</Link>}
        </div>
        {items.length === 0 ? (
          <div className="card px-6 py-14 text-center text-muted">جزوه‌ای با این مشخصات پیدا نشد.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
        <div className="mt-10 grid gap-3 rounded-2xl border border-line bg-paper p-5 text-sm sm:grid-cols-3">
          {[
            ["۱", "انتخاب و پرداخت", "جزوه را انتخاب کنید، فرم کوتاه را پر کنید و آنلاین بپردازید."],
            ["۲", "چاپ و آماده‌سازی", "جزوه چاپ می‌شود و پس از آماده شدن پیامک می‌گیرید."],
            ["۳", "تحویل حضوری", "با نشان دادن کد QR یا کد سفارش، جزوه را در شعبه تحویل بگیرید."],
          ].map(([n, t, d]) => (
            <div key={n} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold/20 font-extrabold text-gold-ink">{n}</span>
              <span><b className="block text-navy">{t}</b><span className="text-muted">{d}</span></span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted">سفارش قبلی دارید؟ <Link href="/order" className="font-semibold text-edu">پیگیری سفارش</Link></p>
      </section>
    </>
  );
}
