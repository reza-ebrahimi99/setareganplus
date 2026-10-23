/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageTitle, Flash, Empty } from "@/components/admin/ui";
import { formatToman, formatNum, CENTERS } from "@/lib/shop/config";
import { fa } from "@/lib/format";

export const metadata: Metadata = { title: "جزوه‌ها" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const [items, sold] = await Promise.all([
    prisma.product.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }] }),
    prisma.orderItem.groupBy({ by: ["productId"], where: { order: { payStatus: "PAID", stage: { not: "CANCELLED" } } }, _sum: { qty: true } }),
  ]);
  const soldMap = new Map(sold.map((s) => [s.productId, s._sum.qty ?? 0]));
  return (
    <>
      <PageTitle title="جزوه‌ها" sub={`${fa(items.length)} جزوه · ${fa(items.filter((i) => i.active).length)} فعال`} action={<Link href="/admin/shop/products/new" className="btn-gold px-5 py-2 text-sm">+ جزوهٔ جدید</Link>} />
      <Flash ok={ok} />
      {items.length === 0 ? <Empty>هنوز جزوه‌ای ثبت نشده است.</Empty> : (
        <div className="grid gap-3">
          {items.map((p) => (
            <Link key={p.id} href={`/admin/shop/products/${p.id}`} className={`flex items-center gap-4 rounded-2xl border border-line bg-paper p-3 transition hover:border-navy/30 ${p.active ? "" : "opacity-60"}`}>
              <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-navy/5">
                {p.cover ? <img src={p.cover} alt="" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-xs text-muted">بدون جلد</div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-navy">{p.title}</p>
                <p className="mt-0.5 text-xs text-muted">{[p.grade, p.majors.join("، ") || null, p.center ? CENTERS[p.center] : null].filter(Boolean).join(" · ") || "همهٔ پایه‌ها"}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                  {!p.active && <span className="rounded-full bg-line px-2 py-0.5 font-bold text-muted">غیرفعال</span>}
                  {p.featured && <span className="rounded-full bg-gold/20 px-2 py-0.5 font-bold text-gold-ink">ویژه</span>}
                  {p.stock !== null && <span className={`rounded-full px-2 py-0.5 font-bold ${p.stock === 0 ? "bg-gc-soft text-gc" : "bg-edu-soft text-edu"}`}>{p.stock === 0 ? "ناموجود" : `موجودی ${fa(p.stock)}`}</span>}
                  <span className="rounded-full bg-ivory px-2 py-0.5 text-muted">فروش: {formatNum(soldMap.get(p.id) ?? 0)}</span>
                </div>
              </div>
              <div className="shrink-0 text-left">
                <p className="font-extrabold text-navy">{formatToman(p.priceRials)}</p>
                {p.compareAtRials && <p className="text-xs text-muted line-through">{formatToman(p.compareAtRials)}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
