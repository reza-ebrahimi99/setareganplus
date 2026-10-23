import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { badgesFor, bestsellerIds, listProducts } from "@/lib/shop/catalog";
import { CENTERS, formatToman, PICKUP_HOURS } from "@/lib/shop/config";
import { getShopSettings } from "@/lib/shop/settings";
import { zibalConfigured } from "@/lib/shop/zibal";
import { fa } from "@/lib/format";
import { Badges, Cover, Price, ProductCard } from "@/components/shop/ProductCard";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { checkout } from "../actions";
import { Star } from "@/components/site/Star";

type P = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  return prisma.product.findUnique({ where: { slug: decodeURIComponent(slug) } });
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return {};
  return { title: p.title, description: p.summary ?? `${p.title}${p.author ? ` — ${p.author}` : ""}`, openGraph: p.cover ? { images: [p.cover] } : undefined };
}

export default async function ProductPage({ params }: P) {
  const p = await load((await params).slug);
  if (!p || !p.active) notFound();
  const [best, settings, related] = await Promise.all([bestsellerIds(), getShopSettings(), listProducts({ grade: p.grade ?? undefined }, 5)]);
  const badges = badgesFor(p, best);
  const out = p.stock === 0;
  const disabled = out ? "ناموجود" : !settings.open ? "ثبت سفارش موقتاً بسته است" : !zibalConfigured() ? "پرداخت آنلاین به‌زودی فعال می‌شود" : null;
  const specs = [
    p.author && ["مدرس / مؤلف", p.author],
    p.grade && ["پایه", p.grade],
    p.majors.length > 0 && ["رشته", p.majors.join("، ")],
    p.subject && ["درس", p.subject],
    p.pageCount && ["تعداد صفحات", fa(p.pageCount)],
    p.center && ["مرکز", CENTERS[p.center] ?? p.center],
    ...(p.specs ?? "").split("\n").map((l) => l.split(":")).filter((x) => x.length >= 2 && x[0].trim()).map((x) => [x[0].trim(), x.slice(1).join(":").trim()]),
  ].filter(Boolean) as [string, string][];
  const others = related.filter((r) => r.id !== p.id).slice(0, 4);

  return (
    <>
      <div className="container-x pt-5 text-sm text-muted">
        <Link href="/shop" className="hover:text-navy">فروشگاه جزوه</Link> <span className="mx-1">‹</span> <span className="text-ink">{p.title}</span>
      </div>
      <section className="container-x grid gap-8 py-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12 lg:py-10">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative mx-auto aspect-[3/4] max-w-sm overflow-hidden rounded-[1.5rem] border border-line bg-paper shadow-xl shadow-navy/5 lg:max-w-none">
            <Cover title={p.title} subject={p.subject} cover={p.cover} seed={p.slug} />
            <Badges badges={badges} className="absolute top-4 right-4" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl leading-snug font-extrabold text-navy sm:text-3xl">{p.title}</h1>
          {p.author && <p className="mt-2 font-semibold text-edu">{p.author}</p>}
          {p.summary && <p className="mt-3 leading-8 text-ink/85">{p.summary}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Price rials={p.priceRials} compareAt={p.compareAtRials} size="lg" />
            {p.stock !== null && p.stock > 0 && p.stock <= 5 && <span className="chip bg-gc-soft text-gc">فقط {fa(p.stock)} عدد باقی مانده</span>}
          </div>
          {specs.length > 0 && (
            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm sm:grid-cols-3">
              {specs.map(([k, v]) => (
                <div key={k} className="bg-paper px-4 py-3"><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5 font-semibold text-navy">{v}</dd></div>
              ))}
            </dl>
          )}
          {p.description && <div className="prose-fa mt-6">{p.description.split(/\n\s*\n/).map((t, i) => <p key={i}>{t}</p>)}</div>}

          <div id="buy" className="card mt-8 scroll-mt-24 p-5 sm:p-6">
            <h2 className="mb-1 text-lg font-extrabold text-navy">ثبت سفارش و پرداخت</h2>
            <p className="mb-5 text-sm text-muted">اطلاعات دانش‌آموز را وارد کنید؛ پس از پرداخت، رسید و کد تحویل برایتان پیامک می‌شود.</p>
            <CheckoutForm productId={p.id} action={checkout} priceLabel={formatToman(p.priceRials)} disabled={disabled} defaultGrade={p.grade} />
          </div>
          <ul className="mt-5 space-y-1.5 text-sm text-muted">
            <li className="flex gap-2"><Star className="mt-1.5 size-3 shrink-0 text-gold" />ارسال پستی نداریم؛ تحویل فقط حضوری در شعبهٔ انتخابی.</li>
            <li className="flex gap-2"><Star className="mt-1.5 size-3 shrink-0 text-gold" />ساعت تحویل: {PICKUP_HOURS.join(" · ")}</li>
          </ul>
        </div>
      </section>
      {!out && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 p-3 backdrop-blur lg:hidden">
          <div className="container-x flex items-center justify-between gap-3 px-0">
            <Price rials={p.priceRials} compareAt={p.compareAtRials} />
            <a href="#buy" className="btn-gold px-6 py-2.5 text-sm">خرید جزوه</a>
          </div>
        </div>
      )}
      {others.length > 0 && (
        <section className="container-x pb-24 lg:pb-16">
          <h2 className="mb-4 text-xl font-extrabold text-navy">جزوه‌های مرتبط</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">{others.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </>
  );
}
