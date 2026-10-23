/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { fa } from "@/lib/format";
import { Star } from "./Star";

export const ACCENT = {
  education: { text: "text-edu", bg: "bg-edu", soft: "bg-edu-soft", border: "border-edu", tone: "edu" as const },
  ghalamchi: { text: "text-gc", bg: "bg-gc", soft: "bg-gc-soft", border: "border-gc", tone: "gc" as const },
};
export type CenterSlug = keyof typeof ACCENT;
export function accentOf(slug: string) {
  return ACCENT[(slug in ACCENT ? slug : "education") as CenterSlug];
}

export function CenterCard({
  slug,
  name,
  tagline,
  image,
  points,
}: {
  slug: string;
  name: string;
  tagline?: string | null;
  image?: string | null;
  points: string[];
}) {
  const a = accentOf(slug);
  return (
    <Link href={`/${slug}`} className="group card flex flex-col overflow-hidden transition-shadow hover:shadow-xl hover:shadow-navy/5">
      <div className="relative aspect-[16/9] overflow-hidden bg-line">
        {image && <img src={image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
        <span className={`absolute inset-x-0 bottom-0 h-1.5 ${a.bg}`} />
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <span className={`inline-flex items-center gap-2 text-sm font-semibold ${a.text}`}>
          <Star className="size-3.5" />
          {slug === "ghalamchi" ? "نمایندگی رسمی" : "آموزشگاه"}
        </span>
        <h3 className="mt-2 text-xl font-extrabold text-navy sm:text-2xl">{name}</h3>
        {tagline && <p className="mt-2 text-muted">{tagline}</p>}
        {points.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {points.map((p) => (
              <li key={p} className={`rounded-full ${a.soft} px-3 py-1 text-sm font-medium ${a.text}`}>{p}</li>
            ))}
          </ul>
        )}
        <span className={`mt-auto pt-6 text-sm font-bold ${a.text}`}>
          ورود به صفحه {slug === "ghalamchi" ? "نمایندگی" : "آموزشگاه"} ←
        </span>
      </div>
    </Link>
  );
}

export function StatsBand({ stats, dark = false }: { stats: { value: string; label: string }[]; dark?: boolean }) {
  return (
    <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] ${dark ? "bg-white/10" : "border border-line bg-line"} md:grid-cols-4`}>
      {stats.map((s) => (
        <div key={s.label} className={`${dark ? "bg-navy" : "bg-paper"} px-5 py-6 text-center sm:py-8`}>
          <dt className={`order-2 mt-1 text-sm ${dark ? "text-white/70" : "text-muted"}`}>{s.label}</dt>
          <dd className={`text-3xl font-extrabold sm:text-4xl ${dark ? "text-white" : "text-navy"}`}>{fa(s.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AchievementCard({
  a,
}: {
  a: { name: string; category: string; grade: string | null; detail: string | null; year: string | null; photo: string | null; featured?: boolean };
}) {
  const konkur = a.category === "KONKUR";
  return (
    <article className="card flex gap-4 p-3.5 sm:flex-col sm:gap-0 sm:p-0 sm:overflow-hidden">
      <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-ivory sm:aspect-[4/5] sm:size-auto sm:w-full sm:rounded-none">
        {a.photo ? (
          <img src={a.photo} alt={a.name} loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center"><Star className="size-10 text-line" /></div>
        )}
      </div>
      <div className="min-w-0 sm:p-4">
        <span className={`chip ${konkur ? "bg-edu-soft text-edu" : "bg-gold/15 text-gold-ink"}`}>
          {konkur ? "کنکور" : "تیزهوشان و نمونه دولتی"}
        </span>
        <h3 className="mt-2 font-extrabold text-navy">{a.name}</h3>
        {a.detail && <p className="mt-0.5 text-sm leading-6 text-ink/80">{a.detail}</p>}
        <p className="mt-1 text-xs text-muted">{a.grade}{a.grade && a.year && " · "}{a.year && <bdi dir="ltr">{a.year}</bdi>}</p>
      </div>
    </article>
  );
}

export function TeamCard({ m }: { m: { name: string; role: string; education: string | null; photo: string | null; bio?: string | null } }) {
  return (
    <article className="card overflow-hidden">
      <div className="aspect-square overflow-hidden bg-ivory">
        {m.photo ? (
          <img src={m.photo} alt={m.name} loading="lazy" className="size-full object-cover object-top" />
        ) : (
          <div className="flex size-full items-center justify-center"><Star className="size-16 text-line" /></div>
        )}
      </div>
      <div className="p-4 sm:p-5">
        <h3 className="font-extrabold text-navy">{m.name}</h3>
        <p className="mt-0.5 text-sm font-medium text-edu">{m.role}</p>
        {m.education && <p className="mt-1 text-xs text-muted">{m.education}</p>}
      </div>
    </article>
  );
}
