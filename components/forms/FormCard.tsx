import Link from "next/link";
import type { PublicForm } from "@/lib/forms/public-types";
import { themeVars } from "@/lib/forms/themes";
import { priceBadge, capacityBadge, deadlineBadge } from "@/lib/forms/badges";
import { mdToText } from "@/lib/markdown";

export const formHref = (slug: string) => (slug === "pre-registration" ? "/register" : `/f/${slug}`);

/** Cover card for /forms and the home page. */
export function FormCard({ f, priority = false }: { f: PublicForm; priority?: boolean }) {
  const price = priceBadge(f);
  const cap = capacityBadge(f);
  const dl = deadlineBadge(f);
  const closed = f.state === "full" || f.state === "closed";
  return (
    <Link href={formHref(f.slug)} data-form-card={f.slug} className="group card card-hover flex flex-col overflow-hidden !rounded-[1.5rem]" style={themeVars(f.theme)}>
      <div className="relative aspect-[16/9] overflow-hidden bg-[radial-gradient(120%_120%_at_85%_0%,var(--fh2),var(--fh1)_65%)]">
        {f.coverImage ? (
          <img src={f.coverImage} alt="" loading={priority ? "eager" : "lazy"} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex size-full items-center justify-center"><span className="text-6xl text-white/15">★</span></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent" />
        <span className={`absolute top-3 right-3 rounded-full px-3 py-1 text-sm font-black shadow ${price.free ? "bg-emerald-500 text-white" : "bg-gold text-navy"}`} data-price-badge>{price.text}</span>
        {(cap || dl) && <span className={`absolute bottom-3 right-3 rounded-full px-2.5 py-0.5 text-xs font-bold backdrop-blur ${closed ? "bg-gc text-white" : "bg-white/85 text-navy"}`}>{cap ?? dl}</span>}
        {f.logo && <img src={f.logo} alt="" className="absolute bottom-3 left-3 size-10 rounded-xl bg-white object-contain p-1 shadow" />}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg leading-snug font-black text-navy group-hover:text-royal">{f.title}</h3>
        {f.description && <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted">{mdToText(f.description)}</p>}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold text-[var(--fa)]">
          {f.state === "soon" ? "به‌زودی" : closed ? "مشاهده" : price.free ? "ثبت‌نام رایگان" : "ثبت‌نام و پرداخت"} <span aria-hidden className="transition-transform group-hover:-translate-x-1">←</span>
        </span>
      </div>
    </Link>
  );
}
