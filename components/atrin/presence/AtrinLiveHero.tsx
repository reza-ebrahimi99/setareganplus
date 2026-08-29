"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { AtrinCore } from "@/components/atrin/presence/AtrinCore";
import { ATRIN_BRAND } from "@/content/atrin";
import { getAtrinGreetingSet } from "@/lib/atrin/greetings";
import type { AtrinProfile } from "@/lib/atrin/profile";
import { daysSinceLastVisit } from "@/lib/atrin/profile";

type AtrinLiveHeroProps = {
  profile: AtrinProfile;
  onStartChat: () => void;
};

export function AtrinLiveHero({ profile, onStartChat }: AtrinLiveHeroProps) {
  const reduce = useReducedMotion();
  const greetings = useMemo(() => getAtrinGreetingSet(), []);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce || greetings.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % greetings.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [greetings.length, reduce]);

  const active = greetings[index] ?? greetings[0];
  const days = daysSinceLastVisit(profile);
  const returning = profile.visitCount > 1;

  return (
    <section
      className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]"
      aria-label="آترین — همراه هوشمند آموزش"
    >
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] text-[#c4b5fd]">
          <span className="atrin-online-dot size-1.5 rounded-full bg-emerald-400" />
          {ATRIN_BRAND.product} · زنده
        </div>

        {returning ? (
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 text-sm text-cyan-200"
          >
            خوش برگشتی
            {profile.grade ? ` · ${profile.grade}` : ""}
            {days !== null && days >= 1
              ? ` · ${days === 1 ? "دیروز" : `${days} روز پیش`} دیدیم هم`
              : ""}
            {profile.recentPrompts[0]
              ? " — ادامه گفتگوی قبلی را می‌خواهی؟"
              : ""}
          </motion.p>
        ) : null}

        <div className="min-h-[9.5rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <p className="text-lg text-slate-200">{active.lines[0]}</p>
              <h1 className="atrin-gradient-text mt-2 text-3xl font-extrabold leading-tight sm:text-5xl">
                {active.lines[1] ?? "من آترین هستم."}
              </h1>
              {active.lines.slice(2).map((line) => (
                <p
                  key={line}
                  className="mt-3 max-w-xl text-sm leading-8 text-slate-300 sm:text-base"
                >
                  {line}
                </p>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-4 text-sm font-medium text-[#c4b5fd]">
          {ATRIN_BRAND.subtitle}
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onStartChat}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-l from-[#7c3aed] to-[#06b6d4] px-5 text-sm font-bold text-white shadow-[0_0_28px_rgb(124_58_237_/_0.4)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22d3ee]"
          >
            شروع گفتگو
          </button>
          <a
            href="#atrin-capabilities"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-slate-100 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22d3ee]"
          >
            قابلیت‌ها
          </a>
        </div>
      </div>

      <AtrinCore />
    </section>
  );
}
