import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function Upsell({ slug, consult, topic }: { slug: string; consult: boolean; topic: string }) {
  const product = slug ? await prisma.product.findFirst({ where: { slug, active: true }, select: { slug: true, title: true, summary: true } }).catch(() => null) : null;
  if (!product && !consult) return null;
  return (
    <div className="cl-card space-y-3 p-5">
      <p className="font-extrabold">کنار این مبحث</p>
      {product && (
        <Link href={`/shop/${product.slug}`} className="block rounded-2xl bg-black/[0.04] p-3">
          <b className="block">جزوهٔ {product.title}</b>
          <span className="cl-muted text-sm">{product.summary || "خرید آنلاین، تحویل حضوری در شعبه"}</span>
        </Link>
      )}
      {consult && (
        <Link href="/moshavere" className="block rounded-2xl bg-black/[0.04] p-3">
          <b className="block">مشاورهٔ رایگان</b>
          <span className="cl-muted text-sm">برای برنامه‌ریزی «{topic}» یک وقت ۳۰ دقیقه‌ای بگیر.</span>
        </Link>
      )}
    </div>
  );
}
