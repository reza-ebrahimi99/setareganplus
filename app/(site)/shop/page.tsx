import type { Metadata } from "next";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { JsonLd } from "@/components/site/JsonLd";
import Link from "next/link";
import { listProducts, catalogFacets } from "@/lib/shop/catalog";
import { getShopSettings } from "@/lib/shop/settings";
import { CENTERS, GRADES, MAJORS } from "@/lib/shop/config";
import { fa } from "@/lib/format";
import { ProductCard } from "@/components/shop/ProductCard";
import { Eyebrow, Icon, Sparkle, Star } from "@/components/site/Star";

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  // filtered / search result views point to the main catalogue; free-text search pages are not indexed
  return pageMeta("shop", { noindex: !!sp.q });
}

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
        <Link href={chipHref(sp, k)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${!sp[k] ? "border-royal bg-royal text-white shadow-[var(--shadow-glow)]" : "border-line bg-paper text-ink/80 hover:border-royal/30"}`}>همه</Link>
        {list.map((v) => (
          <Link key={v} href={chipHref(sp, k, v)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${sp[k] === v ? "border-royal bg-royal text-white shadow-[var(--shadow-glow)]" : "border-line bg-paper text-ink/80 hover:border-royal/30"}`}>{label(v)}</Link>
        ))}
      </div>
    );

  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "فروشگاه جزوه" }])} />
      <section data-sp-lean-shop="" className="bg-hero relative overflow-hidden text-white">
        <div className="bg-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_80%_at_70%_20%,black,transparent)]" />
        <div className="pointer-events-none absolute -top-24 left-[10%] size-96 rounded-full bg-royal/45 blur-3xl" />
        <Star filled={false} className="pointer-events-none absolute -bottom-24 -left-16 size-80 text-white/[0.06]" />
        <Sparkle className="animate-twinkle pointer-events-none absolute top-10 left-[30%] size-3 text-gold" />
        <div className="container-x relative pt-10 pb-16 sm:pt-14 sm:pb-20">
          <span className="rise inline-block"><Eyebrow tone="light">فروشگاه جزوه</Eyebrow></span>
          <h1 className="rise rise-1 mt-4 text-[2rem] leading-[1.35] font-black tracking-tight sm:text-5xl sm:leading-[1.25]">جزوه‌های مدرسان <span className="text-gradient">ستارگان</span></h1>
          <p className="rise rise-2 mt-4 max-w-2xl leading-8 text-white/75 sm:text-lg sm:leading-9">آنلاین سفارش دهید، امن پرداخت کنید و جزوهٔ چاپ‌شده را در شعبهٔ دختران یا پسران قلم‌چی نسیم‌شهر تحویل بگیرید.</p>
          <form action="/shop" className="rise rise-3 mt-7 flex max-w-xl gap-2 rounded-full bg-white p-1.5 shadow-2xl shadow-black/30">
            {sp.grade && <input type="hidden" name="grade" value={sp.grade} />}
            {sp.major && <input type="hidden" name="major" value={sp.major} />}
            {sp.center && <input type="hidden" name="center" value={sp.center} />}
            <span className="flex items-center ps-3 text-muted"><Icon name="search" className="size-5" /></span>
            <input name="q" aria-label="جست‌وجوی جزوه" defaultValue={sp.q} placeholder="جست‌وجوی نام جزوه، درس یا مدرس…" className="min-w-0 flex-1 bg-transparent px-1 text-[0.95rem] text-ink placeholder:text-muted/70 focus:outline-none" />
            <button className="btn-primary shrink-0 px-5 py-2.5">جست‌وجو</button>
          </form>
          <ul className="rise rise-4 mt-7 flex flex-wrap gap-2 text-sm">
            {([["shield", "پرداخت امن زیبال"], ["sms", "پیامک آماده‌شدن سفارش"], ["qr", "تحویل حضوری با کد QR"]] as const).map(([ic, t]) => (
              <li key={t} className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white/85"><Icon name={ic} className="size-4 text-gold" />{t}</li>
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
          <div className="card px-6 py-16 text-center text-muted">جزوه‌ای با این مشخصات پیدا نشد.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
        <div className="mt-12 grid gap-4 rounded-[1.75rem] border border-line bg-paper p-6 text-sm shadow-[var(--shadow-soft)] sm:grid-cols-3 sm:p-8">
          {[
            ["۱", "انتخاب و پرداخت", "جزوه را انتخاب کنید، فرم کوتاه را پر کنید و آنلاین بپردازید."],
            ["۲", "چاپ و آماده‌سازی", "جزوه چاپ می‌شود و پس از آماده شدن پیامک می‌گیرید."],
            ["۳", "تحویل حضوری", "با نشان دادن کد QR یا کد سفارش، جزوه را در شعبه تحویل بگیرید."],
          ].map(([n, t, d]) => (
            <div key={n} className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-royal to-royal-2 text-base font-black text-white shadow-lg">{n}</span>
              <span><b className="block text-navy">{t}</b><span className="text-muted">{d}</span></span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted">سفارش قبلی دارید؟ <Link href="/order" className="font-semibold text-edu">پیگیری سفارش</Link></p>
      </section>
    </>
  );
}
