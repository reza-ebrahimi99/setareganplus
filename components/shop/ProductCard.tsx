/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Star } from "@/components/site/Star";
import { formatToman } from "@/lib/shop/config";
import type { Badge } from "@/lib/shop/catalog";

const PALETTE = ["from-navy to-navy-2", "from-[#183b6b] to-[#2c6cb0]", "from-[#5a1f2a] to-[#c8363d]", "from-[#14463b] to-[#1f7a5c]", "from-[#3b2a63] to-[#6b4fb0]"];

export function Cover({ title, subject, cover, seed = "", className = "" }: { title: string; subject?: string | null; cover?: string | null; seed?: string; className?: string }) {
  if (cover) return <img src={cover} alt={title} loading="lazy" className={`size-full object-cover ${className}`} />;
  const i = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length;
  return (
    <div className={`relative flex size-full flex-col justify-between overflow-hidden bg-gradient-to-br p-5 text-white ${PALETTE[i]} ${className}`}>
      <Star filled={false} className="pointer-events-none absolute -bottom-10 -left-10 size-44 text-white/10" />
      <span className="flex items-center gap-1.5 text-xs font-semibold text-gold"><Star className="size-3" />{subject || "جزوه"}</span>
      <span className="relative text-lg leading-8 font-extrabold">{title}</span>
      <span className="text-[0.7rem] text-white/60">ستارگان پلاس</span>
    </div>
  );
}

const BADGE: Record<Badge, { label: string; cls: string }> = {
  out: { label: "ناموجود", cls: "bg-ink/80 text-white" },
  best: { label: "پرفروش", cls: "bg-gold text-navy" },
  new: { label: "جدید", cls: "bg-emerald-600 text-white" },
  sale: { label: "تخفیف", cls: "bg-gc text-white" },
};
export function Badges({ badges, className = "" }: { badges: Badge[]; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map((b) => <span key={b} className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold shadow-sm ${BADGE[b].cls}`}>{BADGE[b].label}</span>)}
    </div>
  );
}

export function Price({ rials, compareAt, size = "md" }: { rials: number; compareAt?: number | null; size?: "md" | "lg" }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className={`font-extrabold text-navy ${size === "lg" ? "text-2xl" : "text-[1.05rem]"}`}>{formatToman(rials)}</span>
      {compareAt && compareAt > rials && <span className="text-sm text-muted line-through">{formatToman(compareAt)}</span>}
    </span>
  );
}

export type CardProduct = { id: string; slug: string; title: string; author: string | null; subject: string | null; grade: string | null; cover: string | null; priceRials: number; compareAtRials: number | null; stock: number | null; badges: Badge[] };

export function ProductCard({ p }: { p: CardProduct }) {
  const out = p.stock === 0;
  return (
    <Link href={`/shop/${p.slug}`} className={`group card flex flex-col overflow-hidden transition-shadow hover:shadow-lg hover:shadow-navy/5 ${out ? "opacity-75" : ""}`}>
      <div className="relative aspect-[3/4] overflow-hidden bg-ivory">
        <Cover title={p.title} subject={p.subject} cover={p.cover} seed={p.slug} className="transition-transform duration-500 group-hover:scale-[1.03]" />
        <Badges badges={p.badges} className="absolute top-3 right-3" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex flex-wrap gap-1.5 text-[0.72rem] text-muted">
          {p.grade && <span className="rounded-full bg-ivory px-2 py-0.5">{p.grade}</span>}
          {p.subject && <span className="rounded-full bg-ivory px-2 py-0.5">{p.subject}</span>}
        </div>
        <h3 className="leading-7 font-bold text-navy">{p.title}</h3>
        {p.author && <p className="mt-0.5 text-sm text-muted">{p.author}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <Price rials={p.priceRials} compareAt={p.compareAtRials} />
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${out ? "bg-line text-muted" : "bg-gold text-navy group-hover:bg-[#f4b72a]"}`}>{out ? "ناموجود" : "خرید"}</span>
        </div>
      </div>
    </Link>
  );
}
