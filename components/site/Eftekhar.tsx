"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import {
  EFTEKHAR_GROUPS,
  EFTEKHAR_GROUP_ORDER,
  eftekharAlt,
  eftekharCounts,
  eftekharPhoto,
  GROUP_STYLE,
  type EftekharGroup,
  type EftekharStudent,
} from "@/lib/eftekhar";
import { fa } from "@/lib/format";

type Filter = "all" | EftekharGroup;

function GroupBadge({ g, className = "" }: { g: EftekharGroup; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full bg-gradient-to-l px-2.5 py-0.5 text-[0.7rem] font-black text-white shadow-md ring-2 ring-white ${GROUP_STYLE[g].grad} ${className}`}>
      {EFTEKHAR_GROUPS[g].label}
    </span>
  );
}

function FeaturedCard({ s, i }: { s: EftekharStudent; i: number }) {
  const st = GROUP_STYLE[s.group];
  return (
    <li className="eft-in col-span-2 sm:row-span-2 sm:min-h-[24rem]" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
      <article className={`group relative h-full overflow-hidden rounded-[1.6rem] bg-gradient-to-br p-[3px] shadow-[var(--shadow-lift)] transition-transform duration-300 hover:-translate-y-1 ${st.grad}`}>
        <div className="relative flex h-full overflow-hidden rounded-[1.45rem] bg-paper sm:block">
          <div className="relative w-[42%] shrink-0 overflow-hidden sm:absolute sm:inset-0 sm:w-full">
            <img
              src={eftekharPhoto(s)}
              srcSet={`${eftekharPhoto(s, 240)} 240w, ${eftekharPhoto(s)} 480w`}
              sizes="(min-width: 1280px) 290px, (min-width: 1024px) 32vw, (min-width: 640px) 44vw, 40vw"
              alt={eftekharAlt(s)}
              width={480}
              height={600}
              loading="lazy"
              decoding="async"
              className="aspect-[4/5] h-full w-full object-cover object-[50%_30%] transition-transform duration-700 group-hover:scale-[1.06] sm:aspect-auto"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-2/5 bg-gradient-to-t from-navy/90 via-navy/40 to-transparent sm:block" />
            <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[0.68rem] font-black text-navy shadow-md">
              <svg viewBox="0 0 24 24" className="size-3" fill="currentColor" aria-hidden="true"><path d="m12 2.8 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>
              ویژه
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4 sm:absolute sm:inset-x-0 sm:bottom-0 sm:p-4 sm:text-white">
            <GroupBadge g={s.group} className="w-fit sm:hidden" />
            <h3 className="text-lg leading-snug font-black text-navy sm:text-xl sm:text-white sm:drop-shadow">{s.name}</h3>
            <p className={`w-fit rounded-xl bg-gradient-to-l px-3 py-1.5 text-[0.82rem] leading-6 font-black text-white shadow-lg ${st.grad}`}>
              {s.major} <span className="font-bold opacity-90">{s.uni}</span>
            </p>
          </div>
        </div>
      </article>
    </li>
  );
}

function SmallCard({ s, i }: { s: EftekharStudent; i: number }) {
  const st = GROUP_STYLE[s.group];
  return (
    <li className="eft-in" style={{ animationDelay: `${Math.min(i, 18) * 30}ms` }}>
      <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-line/80 bg-paper shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
        <div className="relative overflow-hidden">
          <img
            src={eftekharPhoto(s, 240)}
            srcSet={`${eftekharPhoto(s, 240)} 240w, ${eftekharPhoto(s)} 480w`}
            sizes="(min-width: 1280px) 140px, (min-width: 1024px) 15vw, (min-width: 640px) 22vw, 46vw"
            alt={eftekharAlt(s)}
            width={240}
            height={300}
            loading="lazy"
            decoding="async"
            className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]"
          />
          <GroupBadge g={s.group} className="absolute top-2 left-2" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-0.5 px-2 pt-2.5 pb-3 text-center">
          <h3 className="text-[0.92rem] leading-6 font-black text-navy">{s.name}</h3>
          <p className={`text-[0.74rem] leading-5 font-bold ${st.text}`}>{s.major} {s.uni}</p>
        </div>
        <span className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-l ${st.grad}`} />
      </article>
    </li>
  );
}

/** Per-student showcase with group filter. All cards are server-rendered; the filter only hides cards. */
export function EftekharShowcase({ students }: { students: EftekharStudent[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const counts = eftekharCounts(students);
  const tabs: { key: Filter; label: string; n: number }[] = [
    { key: "all", label: "همه", n: students.length },
    ...EFTEKHAR_GROUP_ORDER.filter((g) => counts[g] > 0).map((g) => ({ key: g as Filter, label: EFTEKHAR_GROUPS[g].label, n: counts[g] })),
  ];
  const shown = filter === "all" ? students : students.filter((s) => s.group === filter);
  const featured = shown.filter((s) => s.featured);
  const rest = shown.filter((s) => !s.featured);

  return (
    <div>
      <div role="group" aria-label="فیلتر بر اساس گروه" className="no-scrollbar -mx-5 mb-7 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
        {tabs.map((t) => {
          const on = t.key === filter;
          const st = t.key === "all" ? null : GROUP_STYLE[t.key];
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(t.key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
                on
                  ? `border-transparent bg-gradient-to-l text-white shadow-lg ${st ? st.grad : "from-navy to-navy-2"}`
                  : "border-line bg-paper text-ink shadow-[var(--shadow-soft)] hover:border-royal/30"
              }`}
            >
              {st && !on && <span className={`size-2 rounded-full ${st.dot}`} />}
              {t.label}
              <span className={`rounded-full px-2 py-0.5 text-[0.7rem] ${on ? "bg-white/20" : "bg-sky text-muted"}`}>{fa(t.n)}</span>
            </button>
          );
        })}
      </div>

      {/* key = filter → cards replay their entrance animation on every filter change */}
      <ul key={filter} className="grid grid-flow-row-dense grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6 xl:grid-cols-8 xl:gap-4">
        {featured.map((s, i) => <FeaturedCard key={s.slug} s={s} i={i} />)}
        {rest.map((s, i) => <SmallCard key={s.slug} s={s} i={i + featured.length} />)}
      </ul>
      <p className="sr-only" aria-live="polite">{fa(shown.length)} دانش‌آموز نمایش داده می‌شود</p>
    </div>
  );
}
