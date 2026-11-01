/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { fa } from "@/lib/format";
import { FIELDS, HONORS_PATH, HONOR_TABS, faText, honorTabHref, splitMajor, type HonorField, type HonorStudent, type HonorTabKey } from "@/lib/honors";
import { responsive, sized } from "@/lib/img";
import { Icon, Star, Sparkle } from "./Star";

/** Field colours follow the official banner: ریاضی blue, تجربی red, انسانی green. (Static strings so Tailwind sees them.) */
export const FIELD_STYLE: Record<HonorField, { grad: string; text: string; soft: string; ring: string; glow: string; bar: string }> = {
  riazi: { grad: "from-[#3b74ff] to-[#1d3fb3]", text: "text-[#1f4fd8]", soft: "bg-[#edf2ff]", ring: "ring-[#3b74ff]/20", glow: "bg-[#3b74ff]/30", bar: "bg-[#2f63f0]" },
  tajrobi: { grad: "from-[#f04a57] to-[#b51f37]", text: "text-[#c8263a]", soft: "bg-[#fdeef0]", ring: "ring-[#f04a57]/20", glow: "bg-[#f04a57]/30", bar: "bg-[#e23a4a]" },
  ensani: { grad: "from-[#22b77e] to-[#0b7a52]", text: "text-[#0f8a5c]", soft: "bg-[#e9f8f1]", ring: "ring-[#22b77e]/20", glow: "bg-[#22b77e]/30", bar: "bg-[#19a36d]" },
};

export function FieldIcon({ field, className = "size-5" }: { field: HonorField; className?: string }) {
  const paths = {
    // calculator
    riazi: <><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M8 7h8M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M8.5 15h.01M12 15h.01M15.5 15h.01M8.5 18h.01M12 18h.01M15.5 18h.01" strokeLinecap="round" /></>,
    // flask
    tajrobi: <><path d="M9.5 3h5M10 3v6L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9V3" strokeLinejoin="round" strokeLinecap="round" /><path d="M7.5 15h9" strokeLinecap="round" /></>,
    // book / people
    ensani: <><circle cx="12" cy="7.5" r="3" /><circle cx="5.5" cy="9.5" r="2.2" /><circle cx="18.5" cy="9.5" r="2.2" /><path d="M6.5 20a5.5 5.5 0 0 1 11 0M1.8 18.5a3.8 3.8 0 0 1 5-3.4M22.2 18.5a3.8 3.8 0 0 0-5-3.4" strokeLinecap="round" /></>,
  }[field];
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth={1.9}>
      {paths}
    </svg>
  );
}

function Photo({ s, className, sizes }: { s: HonorStudent; className: string; sizes?: string }) {
  return s.photo ? (
    <img src={s.photo} alt={`${s.name}، رتبهٔ ${fa(s.rank)} کنکور ${FIELDS[s.field].label}`} width={480} height={600} sizes={sizes} loading="lazy" decoding="async" className={`object-cover ${className}`} />
  ) : (
    <span className={`flex items-center justify-center bg-sky ${className}`}><Star className="size-1/3 text-royal/20" /></span>
  );
}

/** Big card for the best rank of a field. */
export function TopperCard({ s, year }: { s: HonorStudent; year: number }) {
  const st = FIELD_STYLE[s.field];
  const f = FIELDS[s.field];
  return (
    <article className="reveal group relative">
      <div className={`pointer-events-none absolute -inset-2 hidden rounded-[2.2rem] opacity-60 blur-2xl md:block ${st.glow}`} />
      <div className={`relative overflow-hidden rounded-[1.9rem] bg-gradient-to-br ${st.grad} p-[3px] shadow-[var(--shadow-lift)]`}>
        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br text-white">
          <div className={`absolute inset-0 bg-gradient-to-br ${st.grad}`} />
          <div className="bg-dots pointer-events-none absolute inset-0 opacity-60" />
          <Star filled={false} className="pointer-events-none absolute -top-10 -left-10 size-44 text-white/10" />
          <Sparkle className="animate-twinkle pointer-events-none absolute top-6 left-[38%] size-3 text-[#ffe08a]" />
          <div className="relative grid grid-cols-[1fr_auto] items-end gap-3 p-4 sm:p-5 md:grid-cols-1 md:justify-items-center md:text-center xl:grid-cols-[1fr_auto] xl:justify-items-stretch xl:text-right">
            <div className="min-w-0 self-center">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/15 px-2.5 py-1 text-[0.72rem] font-bold backdrop-blur">
                <FieldIcon field={s.field} className="size-3.5" /> برترین رتبهٔ {f.label}
              </span>
              <p className="mt-3 text-sm font-semibold text-white/75">رتبه در کنکور</p>
              <p className="text-[3.4rem] leading-none font-black tracking-tight drop-shadow-[0_6px_14px_rgb(0_0_0/0.25)] sm:text-[4.2rem]">{fa(s.rank)}</p>
              <p className="mt-2 whitespace-nowrap text-[0.74rem] text-white/70">کنکور <bdi>{fa(year)}</bdi> · گروه {f.label}</p>
            </div>
            <div className="relative w-[7.25rem] sm:w-[9rem] md:order-first md:w-[8.5rem] xl:order-none xl:w-[9rem]">
              <div className="rounded-[1.4rem] bg-gradient-to-br from-[#ffe08a] via-gold to-[#c98a00] p-[3px] shadow-xl shadow-black/25">
                <Photo s={s} sizes="160px" className="aspect-[4/5] w-full rounded-[1.2rem] bg-white" />
              </div>
              <span className="absolute -top-3 -right-3 flex size-9 items-center justify-center rounded-full bg-gold text-navy shadow-lg ring-4 ring-white/30">
                <Icon name="trophy" className="size-[1.15rem]" strokeWidth={2.1} />
              </span>
            </div>
          </div>
          <div className="relative border-t border-white/15 bg-black/10 px-4 py-3 sm:px-5 md:text-center xl:text-right">
            <h3 className="text-lg font-black sm:text-xl">{s.name}</h3>
            {s.note && <p className="text-xs text-white/75">{s.note}</p>}
          </div>
        </div>
      </div>
    </article>
  );
}

const ORD = ["اول", "دوم", "سوم", "چهارم", "پنجم", "ششم", "هفتم", "هشتم", "نهم", "دهم"];
const ordinal = (n: number) => ORD[n - 1] ?? `${fa(n)}م`;

/** Toppers: a swipeable row on phones, three columns from md. */
export function TopperRow({ top, year }: { top: HonorStudent[]; year: number }) {
  return (
    <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pt-3 pb-6 sm:-mx-8 sm:px-8 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-2 lg:gap-7">
      {top.map((s) => (
        <div key={s.name} className="w-[86%] max-w-sm shrink-0 snap-center md:w-auto md:max-w-none">
          <TopperCard s={s} year={year} />
        </div>
      ))}
    </div>
  );
}

/** Compact row for the other top ranks of a field. */
export function RankRow({ s, place }: { s: HonorStudent; place: number }) {
  const st = FIELD_STYLE[s.field];
  return (
    <li className="reveal card card-hover flex items-center gap-3 !rounded-[1.25rem] p-2.5 pe-4">
      <Photo s={s} sizes="64px" className={`aspect-[4/5] w-14 shrink-0 rounded-xl ring-1 sm:w-16 ${st.ring}`} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-black text-navy">{s.name}</h3>
        <p className="text-xs text-muted">{s.note || <>نفر {ordinal(place)} گروه {FIELDS[s.field].label}</>}</p>
      </div>
      <div className={`shrink-0 rounded-2xl px-3 py-1.5 text-center ${st.soft}`}>
        <span className={`block text-[0.65rem] font-bold ${st.text} opacity-80`}>رتبه</span>
        <span className={`block text-2xl leading-tight font-black ${st.text}`}>{fa(s.rank)}</span>
      </div>
    </li>
  );
}

export function FieldHead({ field, count }: { field: HonorField; count: number }) {
  const st = FIELD_STYLE[field];
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className={`flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${st.grad}`}><FieldIcon field={field} className="size-6" /></span>
      <div>
        <h2 className="text-xl font-black text-navy sm:text-2xl">گروه {FIELDS[field].label}</h2>
        <p className="text-xs font-semibold text-muted">{fa(count)} رتبهٔ برتر</p>
      </div>
      <span className={`ms-auto h-1.5 w-16 rounded-full ${st.bar}`} />
    </div>
  );
}

/** Home page teaser: the three field toppers + a link to the full page. */
export function HomeHonors({ year, top, total, others }: { year: number; top: HonorStudent[]; total: number; others: HonorStudent[] }) {
  return (
    <section aria-labelledby="home-honors" className="relative overflow-hidden py-20 sm:py-24">
      <div className="bg-dots-dark pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_70%_at_50%_40%,black,transparent)]" />
      <div className="container-x relative">
        <div className="reveal mb-8 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="eyebrow"><Icon name="trophy" className="size-3.5 text-gold" />درخشش کانونی‌ها</span>
            <h2 id="home-honors" className="h-section mt-3">رتبه‌های برتر <span className="text-gradient-blue">کنکور {fa(year)}</span></h2>
            <p className="mt-3 text-[1.02rem] leading-8 text-muted">{fa(total)} دانش‌آموز نمایندگی قلم‌چی نسیم‌شهر در گروه‌های ریاضی، تجربی و انسانی؛ با بهترین رتبهٔ {fa(Math.min(...top.map((s) => s.rank)))}.</p>
          </div>
          <Link href={HONORS_PATH} className="btn-ghost self-start text-sm sm:self-auto">همهٔ رتبه‌های برتر <Icon name="arrow" className="size-4" /></Link>
        </div>
        <TopperRow top={top} year={year} />
        {others.length > 0 && (
          <Link href={HONORS_PATH} className="reveal group mx-auto mt-8 flex w-fit items-center gap-3 rounded-full border border-line bg-paper py-1.5 ps-1.5 pe-5 shadow-[var(--shadow-soft)] transition hover:border-royal/30">
            <span className="flex -space-x-3 space-x-reverse">
              {others.slice(0, 6).map((s) => s.photo && <img key={s.name} src={s.photo} alt="" width={40} height={40} loading="lazy" className="size-10 rounded-full border-2 border-white object-cover object-[50%_35%]" />)}
            </span>
            <span className="text-sm font-bold text-navy">و {fa(others.length)} رتبهٔ برتر دیگر</span>
            <Icon name="arrow" className="size-4 text-royal transition-transform group-hover:-translate-x-1" />
          </Link>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs + DB achievement cards (/rotbe-bartar-konkur?tab=…)            */
/* ------------------------------------------------------------------ */
const TAB_ICON: Record<HonorTabKey, "trophy" | "cap" | "star"> = { konkur: "trophy", ghabooli: "cap", tizhooshan: "star" };

export function HonorTabs({ active, counts }: { active: HonorTabKey; counts: Record<HonorTabKey, number> }) {
  return (
    <nav id="tabs" aria-label="بخش‌های افتخارات" className="container-x relative z-10 -mt-7 scroll-mt-24">
      <div className="mx-auto grid max-w-full grid-cols-3 gap-1 rounded-2xl border border-line bg-paper p-1.5 shadow-[var(--shadow-lift)] sm:flex sm:w-fit sm:gap-1.5 sm:rounded-full">
        {HONOR_TABS.map((t) => {
          const on = t.key === active;
          return (
            <Link
              key={t.key}
              href={honorTabHref(t.key)}
              scroll={false}
              aria-current={on ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-center text-[0.74rem] leading-5 font-bold transition sm:shrink-0 sm:flex-row sm:gap-2 sm:whitespace-nowrap sm:rounded-full sm:px-5 sm:py-2.5 sm:text-sm ${on ? "bg-royal text-white shadow-[var(--shadow-glow)]" : "text-ink hover:bg-sky"}`}
            >
              {(() => { const ic = TAB_ICON[t.key]; const cls = `size-4 ${on ? "text-gold" : "text-royal/60"}`; return ic === "star" ? <Star className={cls} /> : <Icon name={ic} className={cls} />; })()}
              {t.label}
              <span className={`rounded-full px-2 py-0.5 text-[0.7rem] ${on ? "bg-white/20" : "bg-sky text-muted"}`}>{fa(counts[t.key])}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export type HonorAchievement = { id: string; name: string; category: string; grade: string | null; detail: string | null; year: string | null; photo: string | null; featured: boolean };

/** Card for a DB achievement (university or gifted-school acceptance). */
export function AchievementTile({ a }: { a: HonorAchievement }) {
  const konkur = a.category === "KONKUR";
  const { major, uni } = konkur ? splitMajor(a.detail) : { major: "", uni: "" };
  const grade = faText(a.grade);
  return (
    <article className="reveal group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-line bg-paper shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      {/* Admin uploads are posters of mixed shapes (16:9, 1:1); show them whole over a blurred copy. */}
      <div className="relative aspect-video overflow-hidden bg-sky">
        {a.photo ? (
          <>
            <img src={sized(a.photo, 320)} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-xl" />
            <img {...responsive(a.photo, "(min-width: 1024px) 270px, (min-width: 640px) 31vw, 46vw", 768)} alt={a.detail ? `${a.name}، قبولی ${faText(a.detail)}` : a.name} loading="lazy" decoding="async" className="relative size-full object-contain transition-transform duration-700 group-hover:scale-[1.04]" />
          </>
        ) : (
          <div className="flex size-full items-center justify-center"><Star className="size-12 text-royal/20" /></div>
        )}
        {a.featured && (
          <span title="برگزیده" className="absolute top-2 left-2 flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-[#ffd65c] to-gold text-navy shadow-lg ring-2 ring-white/70">
            <Star className="size-3.5" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <h3 className="leading-7 font-black text-navy sm:text-[1.05rem]">{a.name}</h3>
          {grade && <span className="rounded-full bg-sky px-2 py-0.5 text-[0.68rem] font-bold text-royal">{konkur ? grade : `پایهٔ ${grade}`}</span>}
        </div>
        {konkur ? (
          <>
            <p className="mt-1 line-clamp-2 text-sm leading-6 font-bold text-royal">{major}</p>
            {uni && <p className="mt-1 flex items-start gap-1.5 text-[0.78rem] leading-5 text-muted"><Icon name="cap" className="mt-0.5 size-3.5 shrink-0 text-gold" /><span className="line-clamp-2">{uni}</span></p>}
          </>
        ) : (
          a.detail && <p className="mt-1 flex items-start gap-1.5 text-[0.82rem] leading-6 text-ink/80"><Icon name="cap" className="mt-1 size-3.5 shrink-0 text-gold" /><span className="line-clamp-3">{faText(a.detail)}</span></p>
        )}
      </div>
    </article>
  );
}
