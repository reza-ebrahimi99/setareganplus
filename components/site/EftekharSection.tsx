/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { fa } from "@/lib/format";
import { HONORS_PATH } from "@/lib/honors";
import {
  EFTEKHAR,
  EFTEKHAR_ANCHOR,
  EFTEKHAR_GROUPS,
  EFTEKHAR_GROUP_ORDER,
  EFTEKHAR_POSTER,
  EFTEKHAR_YEAR,
  GROUP_STYLE,
  eftekharCaption,
  eftekharCounts,
  eftekharPhoto,
} from "@/lib/eftekhar";
import { EftekharShowcase } from "./Eftekhar";
import { PhotoLightbox } from "./PhotoLightbox";
import { Icon, Sparkle, Star } from "./Star";

/** Full showcase on /rotbe-bartar-konkur (first tab). */
export function EftekharSection() {
  const counts = eftekharCounts();
  const featured = EFTEKHAR.filter((s) => s.featured).length;
  const medicine = EFTEKHAR.filter((s) => /پزشکی/.test(s.major)).length;
  const tehran = EFTEKHAR.filter((s) => s.uni === "دانشگاه تهران").length;
  return (
    <section id={EFTEKHAR_ANCHOR} aria-labelledby="eftekhar-title" className="relative mt-16 scroll-mt-24 overflow-hidden py-14 sm:mt-24 sm:py-20">
      {/* warm poster-yellow backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#fff6d8] via-[#fffaf0] to-transparent" />
      <div className="bg-dots-dark pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(70%_60%_at_50%_20%,black,transparent)]" />
      <Star filled={false} className="pointer-events-none absolute -top-16 -right-16 size-72 text-gold/15" />
      <div className="container-x relative">
        <div className="reveal mx-auto mb-8 max-w-3xl text-center sm:mb-10">
          <span className="eyebrow"><Sparkle className="size-3.5 text-gold" />افتخارآفرینان {fa(EFTEKHAR_YEAR)} · قبولی‌های دانشگاه</span>
          <h2 id="eftekhar-title" className="h-section mt-3">موفقیت، <span className="text-gradient-blue">انتخاب ماست</span></h2>
          <p className="mt-3 text-[1.02rem] leading-8 text-muted">
            {fa(EFTEKHAR.length)} دانش‌آموز قلم‌چی نسیم‌شهر در کنکور {fa(EFTEKHAR_YEAR)} به دانشگاه‌های برتر کشور راه یافتند؛ از پزشکی دانشگاه ایران و دندان‌پزشکی دانشگاه تهران تا دانشگاه فرهنگیان.
          </p>
          <dl className="mx-auto mt-6 grid max-w-2xl grid-cols-3 gap-2 sm:gap-3">
            {[
              { v: fa(EFTEKHAR.length), l: "قبولی دانشگاه" },
              { v: fa(medicine), l: "پزشکی و دندان‌پزشکی" },
              { v: fa(tehran), l: "دانشگاه تهران" },
            ].map((x) => (
              <div key={x.l} className="flex flex-col rounded-2xl border border-gold/30 bg-paper/80 px-3 py-2.5 shadow-[var(--shadow-soft)] backdrop-blur">
                <dt className="order-last text-[0.72rem] leading-5 font-semibold text-muted">{x.l}</dt>
                <dd className="text-2xl leading-tight font-black text-navy">{x.v}</dd>
              </div>
            ))}
          </dl>
          <p className="sr-only">
            {EFTEKHAR_GROUP_ORDER.filter((g) => counts[g] > 0).map((g) => `${EFTEKHAR_GROUPS[g].label}: ${fa(counts[g])}`).join("، ")}؛ {fa(featured)} قبولی ویژه.
          </p>
        </div>

        <EftekharShowcase students={EFTEKHAR} />

        {/* the original poster, downscaled (the 20 MB original stays off the site) */}
        <div className="reveal mt-12 grid items-center gap-6 rounded-[2rem] border border-gold/30 bg-paper p-4 shadow-[var(--shadow-soft)] sm:mt-16 sm:grid-cols-[minmax(0,300px)_1fr] sm:p-6">
          <figure className="mx-auto w-full max-w-[300px]">
            <div className="-rotate-[1.5deg] rounded-[1.2rem] bg-gradient-to-br from-[#ffe08a] via-gold to-[#c98a00] p-[4px] shadow-xl">
              <div className="overflow-hidden rounded-[1rem] bg-white">
                <PhotoLightbox full={EFTEKHAR_POSTER.large} alt={`پوستر افتخارآفرینان ${fa(EFTEKHAR_YEAR)} قلم‌چی نسیم‌شهر`} label="مشاهدهٔ بزرگ‌تر پوستر افتخارآفرینان">
                  <img src={EFTEKHAR_POSTER.src} srcSet={`${EFTEKHAR_POSTER.src} 800w, ${EFTEKHAR_POSTER.large} 1600w`} sizes="300px" alt={`پوستر «افتخارآفرینان ${fa(EFTEKHAR_YEAR)}، موفقیت انتخاب ماست»؛ قبولی‌های دانشگاه قلم‌چی نسیم‌شهر`} width={EFTEKHAR_POSTER.width} height={EFTEKHAR_POSTER.height} loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
                </PhotoLightbox>
              </div>
            </div>
          </figure>
          <div className="text-center sm:text-right">
            <h3 className="text-xl font-black text-navy">پوستر رسمی افتخارآفرینان {fa(EFTEKHAR_YEAR)}</h3>
            <p className="mt-2 leading-8 text-muted">همهٔ قبولی‌های این صفحه از پوستر رسمی «موفقیت، انتخاب ماست» کانون فرهنگی آموزش قلم‌چی نسیم‌شهر است. برای دیدن پوستر کامل روی آن بزنید.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
              <Link href="/register" className="btn-gold px-5 py-2.5">مسیر قبولی شما از اینجا شروع می‌شود</Link>
              <Link href="/moshavere" className="btn-ghost px-5 py-2.5"><Icon name="chat" className="size-4" />مشاورهٔ رایگان</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Compact teaser on the home page: a moving strip of mini cards linking to the full showcase. */
export function HomeEftekharStrip() {
  const href = `${HONORS_PATH}#${EFTEKHAR_ANCHOR}`;
  const heads = EFTEKHAR.filter((s) => s.featured).slice(0, 5);
  // mini cards in a mixed order so every group shows up early in the strip
  const mini = [...EFTEKHAR].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  return (
    <section aria-labelledby="home-eftekhar" className="container-x pb-16 sm:pb-20">
      <div className="reveal relative overflow-hidden rounded-[2rem] border border-gold/40 bg-gradient-to-l from-[#fff3c4] via-[#fff9e6] to-[#fff3c4] p-4 shadow-[var(--shadow-soft)] sm:p-6">
        <Sparkle className="animate-twinkle pointer-events-none absolute top-4 left-[30%] size-3 text-gold" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffc83d] to-gold text-navy shadow-lg"><Icon name="cap" className="size-6" /></span>
            <div>
              <h2 id="home-eftekhar" className="text-lg font-black text-navy sm:text-xl">افتخارآفرینان {fa(EFTEKHAR_YEAR)}: {fa(EFTEKHAR.length)} قبولی دانشگاه</h2>
              <p className="text-sm leading-6 text-muted">{heads.map((s) => eftekharCaption(s)).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3).join("، ")} و…</p>
            </div>
          </div>
          <Link href={href} className="btn-gold shrink-0 self-start px-5 py-2.5 text-sm sm:self-auto">دیدن همهٔ افتخارآفرینان <Icon name="arrow" className="size-4" /></Link>
        </div>
        <Link href={href} aria-label={`دیدن ${fa(EFTEKHAR.length)} افتخارآفرین ${fa(EFTEKHAR_YEAR)}`} className="group relative -mx-4 mt-5 block overflow-hidden [mask-image:linear-gradient(to_left,transparent,black_6%,black_94%,transparent)] sm:-mx-6">
          <div className="flex w-max animate-marquee gap-3 group-hover:[animation-play-state:paused]">
            {[0, 1].map((dup) => (
              <ul key={dup} aria-hidden={dup === 1 ? true : undefined} className="flex gap-3 pe-3">
                {mini.map((s) => (
                  <li key={s.slug} className="flex w-56 shrink-0 items-center gap-2.5 rounded-2xl border border-white bg-paper/90 p-1.5 pe-3 shadow-[var(--shadow-soft)]">
                    <img src={eftekharPhoto(s, 240)} alt={dup ? "" : `${s.name} — ${eftekharCaption(s)} — قلم‌چی نسیم‌شهر`} width={48} height={60} loading="lazy" decoding="async" className="h-14 w-11 shrink-0 rounded-xl object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-navy">{s.name}</span>
                      <span className={`block truncate text-[0.72rem] font-bold ${GROUP_STYLE[s.group].text}`}>{eftekharCaption(s)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </Link>
      </div>
    </section>
  );
}
