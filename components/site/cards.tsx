/* eslint-disable @next/next/no-img-element */
import { responsive } from "@/lib/img";
import Link from "next/link";
import { Icon, Star } from "./Star";
import { CountUp } from "./CountUp";

export const ACCENT = {
  education: { text: "text-edu", bg: "bg-edu", soft: "bg-edu-soft", border: "border-edu", tone: "edu" as const, grad: "from-royal to-royal-2", glow: "bg-royal/40" },
  ghalamchi: { text: "text-gc", bg: "bg-gc", soft: "bg-gc-soft", border: "border-gc", tone: "gc" as const, grad: "from-[#e0464f] to-[#b8233a]", glow: "bg-gc/40" },
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
  const gc = slug === "ghalamchi";
  return (
    <Link href={`/${slug}`} className="reveal group card card-hover relative flex flex-col overflow-hidden !rounded-[1.75rem]">
      <div className="relative aspect-[16/10] overflow-hidden bg-line sm:aspect-[16/9]">
        {image && <img {...responsive(image, "(min-width: 1024px) 400px, 92vw", 960)} alt="" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 sm:p-6">
          <span className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-l ${a.grad} px-3.5 py-1.5 text-xs font-bold text-white shadow-lg`}>
            {gc ? (
              <img src="/brand/ghalamchi-96.webp" alt="" width={20} height={20} loading="lazy" className="size-5 rounded-md object-cover" />
            ) : (
              <Star className="size-3.5 text-gold" />
            )}
            {gc ? "نمایندگی رسمی کانون قلم‌چی" : "آموزشگاه تقویتی و کنکور"}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <h3 className="text-xl leading-snug font-black text-navy sm:text-[1.6rem]">{name}</h3>
        {tagline && <p className="mt-2 leading-8 text-muted">{tagline}</p>}
        {points.length > 0 && (
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-2 text-[0.95rem] font-semibold text-ink/85">
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${a.soft} ${a.text}`}><Icon name="check" className="size-3.5" strokeWidth={2.6} /></span>
                {p}
              </li>
            ))}
          </ul>
        )}
        <span className={`mt-auto flex items-center justify-between pt-7 text-sm font-bold ${a.text}`}>
          ورود به صفحه {gc ? "نمایندگی" : "آموزشگاه"}
          <span className={`flex size-10 items-center justify-center rounded-full bg-gradient-to-l ${a.grad} text-white shadow-lg transition-transform duration-300 group-hover:-translate-x-1`}>
            <Icon name="arrow" className="size-4" strokeWidth={2.4} />
          </span>
        </span>
      </div>
    </Link>
  );
}

const STAT_ICON = ["cap", "trophy", "star", "users"] as const;

export function StatsBand({ stats, dark = false }: { stats: { value: string; label: string }[]; dark?: boolean }) {
  if (stats.length === 0) return null;
  return (
    <dl className={`grid grid-cols-2 gap-3 sm:gap-4 ${stats.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
      {stats.map((s, i) => {
        const ic = STAT_ICON[i % STAT_ICON.length];
        return (
          <div
            key={s.label}
            className={`group relative flex flex-col overflow-hidden rounded-[1.4rem] p-4 sm:p-6 ${dark ? "glass" : "card"}`}
          >
            {/* dt first (valid <dl>); shown under the number with CSS order */}
            <dt className={`order-last mt-2 text-[0.8rem] leading-6 font-medium sm:text-sm ${dark ? "text-white/65" : "text-muted"}`}>{s.label}</dt>
            <dd className={`text-[2rem] leading-none font-black sm:text-[2.6rem] ${dark ? "text-white" : "text-navy"}`}>
              <span aria-hidden="true" className={`mb-3 flex size-10 items-center justify-center rounded-2xl ${dark ? "bg-white/10 text-gold" : "bg-sky text-royal"}`}>
                {ic === "star" ? <Star className="size-5" /> : <Icon name={ic} className="size-5" />}
              </span>
              <CountUp value={s.value} />
            </dd>
          </div>
        );
      })}
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
    <article className="reveal group card card-hover relative overflow-hidden !rounded-[1.5rem]">
      <div className="relative aspect-[4/5] overflow-hidden bg-sky">
        {a.photo ? (
          <img {...responsive(a.photo, "(min-width: 1024px) 280px, 46vw", 640)} alt={a.name} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
        ) : (
          <div className="flex size-full items-center justify-center"><Star className="size-14 text-royal/20" /></div>
        )}
        <span className={`absolute top-3 right-3 rounded-full px-2.5 py-1 text-[0.7rem] font-bold shadow-md backdrop-blur ${konkur ? "bg-royal/90 text-white" : "bg-gold/95 text-navy"}`}>
          {konkur ? "کنکور" : "تیزهوشان و نمونه دولتی"}
        </span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy via-navy/70 to-transparent p-4 pt-14 text-white">
          <h3 className="leading-7 font-black">{a.name}</h3>
          {a.detail && <p className="mt-0.5 line-clamp-2 text-[0.8rem] leading-6 text-white/85">{a.detail}</p>}
          {(a.grade || a.year) && (
            <p className="mt-1 text-[0.7rem] text-white/60">{a.grade}{a.grade && a.year && " · "}{a.year && <bdi dir="ltr">{a.year}</bdi>}</p>
          )}
        </div>
      </div>
    </article>
  );
}

export function TeamCard({ m }: { m: { name: string; role: string; education: string | null; photo: string | null; bio?: string | null } }) {
  return (
    <article className="reveal group card card-hover overflow-hidden !rounded-[1.5rem] p-2">
      <div className="relative aspect-square overflow-hidden rounded-[1.1rem] bg-gradient-to-b from-sky to-ivory">
        {m.photo ? (
          <img {...responsive(m.photo, "(min-width: 1024px) 280px, 46vw", 640)} alt={m.name} loading="lazy" decoding="async" className="size-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.05]" />
        ) : (
          <div className="flex size-full items-center justify-center"><Star className="size-16 text-royal/15" /></div>
        )}
      </div>
      <div className="px-2.5 pt-3 pb-2 text-center sm:px-3">
        <h3 className="font-black text-navy">{m.name}</h3>
        <p className="mt-1 inline-block rounded-full bg-sky px-2.5 py-0.5 text-xs font-bold text-royal">{m.role}</p>
        {m.education && <p className="mt-1.5 text-xs leading-5 text-muted">{m.education}</p>}
      </div>
    </article>
  );
}
