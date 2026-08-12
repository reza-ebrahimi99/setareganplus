"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ATRIN_HERO } from "@/content/atrin";

type AtrinHeroProps = {
  visible: boolean;
};

/**
 * First screen only — greeting, no chatbot chrome.
 */
export function AtrinHero({ visible }: AtrinHeroProps) {
  const reduce = useReducedMotion();
  if (!visible) return null;

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="px-1 pb-1 pt-2"
      aria-label="خوش‌آمدگویی آترین"
    >
      <div className="space-y-2 text-start">
        <p className="text-[1.35rem] font-bold tracking-tight text-white sm:text-[1.5rem]">
          {ATRIN_HERO.greeting}
        </p>
        <p className="text-[0.95rem] font-medium text-slate-300">
          {ATRIN_HERO.quickStartTitle}
        </p>
      </div>
    </motion.section>
  );
}
