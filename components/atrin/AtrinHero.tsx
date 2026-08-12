"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AtrinMark } from "@/components/atrin/AtrinMark";
import { ATRIN_HERO } from "@/content/atrin";

type AtrinHeroProps = {
  onStart: () => void;
  visible: boolean;
};

export function AtrinHero({ onStart, visible }: AtrinHeroProps) {
  const reduce = useReducedMotion();
  if (!visible) return null;

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5 px-1 pb-2"
      aria-label="خوش‌آمدگویی آترین"
    >
      <div className="atrin-glass relative overflow-hidden rounded-[1.5rem] p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -start-10 -top-16 size-40 rounded-full bg-[#7c3aed]/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 -end-8 size-36 rounded-full bg-[#22d3ee]/20 blur-3xl"
        />

        <div className="relative flex flex-col items-center text-center">
          <div
            className="mb-4 flex size-24 items-center justify-center rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#7c3aed]/40 via-[#0c1228] to-[#22d3ee]/25 shadow-[0_0_40px_rgb(124_58_237_/_0.35)]"
            aria-hidden
          >
            <AtrinMark size="lg" className="!shadow-none" />
          </div>

          <p className="text-sm text-slate-300">{ATRIN_HERO.greeting}</p>
          <h2 className="atrin-gradient-text mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {ATRIN_HERO.headline}
          </h2>
          <p className="mt-2 text-sm font-medium text-[#c4b5fd]">
            {ATRIN_HERO.role}
          </p>

          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
            {ATRIN_HERO.descriptionLead}{" "}
            <span className="text-slate-100">
              {ATRIN_HERO.topics.join("، ")}
            </span>{" "}
            {ATRIN_HERO.descriptionTail}
          </p>

          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-l from-[#7c3aed] to-[#6d28d9] px-5 text-sm font-bold text-white shadow-[0_0_24px_rgb(124_58_237_/_0.45)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22d3ee]"
            >
              {ATRIN_HERO.ctaPrimary}
            </button>
            <Link
              href={ATRIN_HERO.secondaryHref}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-slate-100 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22d3ee]"
            >
              {ATRIN_HERO.ctaSecondary}
            </Link>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
