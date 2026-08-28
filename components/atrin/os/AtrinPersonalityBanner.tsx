"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ATRIN_PERSONALITY, type AtrinPersonalityState } from "@/content/atrin";

type AtrinPersonalityBannerProps = {
  state: AtrinPersonalityState;
};

export function AtrinPersonalityBanner({ state }: AtrinPersonalityBannerProps) {
  const reduce = useReducedMotion();
  const persona = ATRIN_PERSONALITY[state];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={reduce ? false : { opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: 4 }}
        className="mx-4 mt-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
        style={{ boxShadow: `inset 0 0 0 1px ${persona.accent}33` }}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{
              background: persona.accent,
              boxShadow: `0 0 12px ${persona.accent}`,
            }}
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">{persona.headline}</p>
            <p className="text-[0.7rem] text-slate-400">{persona.subtitle}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
