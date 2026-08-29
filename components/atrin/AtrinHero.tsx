"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ATRIN_HERO } from "@/content/atrin";

type AtrinHeroProps = {
  visible: boolean;
};

/**
 * First-open greeting only — warm mentor tone, then path cards.
 */
export function AtrinHero({ visible }: AtrinHeroProps) {
  const reduce = useReducedMotion();
  if (!visible) return null;

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="px-1 pb-2 pt-2"
      aria-label="خوش‌آمدگویی آترین"
    >
      <div className="space-y-2.5 text-start">
        <p className="text-[1.45rem] font-bold tracking-tight text-white sm:text-[1.6rem]">
          {ATRIN_HERO.greeting}
        </p>
        <p className="text-[1rem] font-medium leading-7 text-slate-100">
          {ATRIN_HERO.invite}
        </p>
        <p className="text-[0.92rem] font-medium leading-6 text-slate-300">
          {ATRIN_HERO.quickStartTitle}
        </p>
      </div>
    </motion.section>
  );
}
