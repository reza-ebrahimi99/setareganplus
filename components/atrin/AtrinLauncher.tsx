"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { AtrinMark } from "@/components/atrin/AtrinMark";
import { ATRIN_BRAND, ATRIN_LAUNCHER_ROTATIONS } from "@/content/atrin";
import { AI_ASSISTANT_FAB_SEEN_KEY } from "@/lib/ai/assistant-config";

type AtrinLauncherProps = {
  open: boolean;
  onOpen: () => void;
};

export function AtrinLauncher({ open, onOpen }: AtrinLauncherProps) {
  const reduce = useReducedMotion();
  const [pulse, setPulse] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(AI_ASSISTANT_FAB_SEEN_KEY);
      if (!seen) setPulse(true);
    } catch {
      setPulse(true);
    }
  }, []);

  useEffect(() => {
    if (open || reduce) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % ATRIN_LAUNCHER_ROTATIONS.length);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [open, reduce]);

  function handleOpen() {
    setPulse(false);
    try {
      window.localStorage.setItem(AI_ASSISTANT_FAB_SEEN_KEY, "1");
    } catch {
      // ignore
    }
    onOpen();
  }

  if (open) return null;

  return (
    <motion.button
      type="button"
      onClick={handleOpen}
      aria-label={ATRIN_BRAND.fabAria}
      title={ATRIN_BRAND.fabAria}
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduce ? undefined : { y: -3, scale: 1.02 }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      className={`atrin-root atrin-glass atrin-glow-ring fixed bottom-5 start-5 z-[70] inline-flex max-w-[min(92vw,20rem)] items-center gap-3 rounded-full px-3.5 py-2.5 text-start sm:bottom-6 sm:start-6 ${
        pulse ? "atrin-launcher-pulse" : ""
      }`}
    >
      <AtrinMark size="sm" />
      <span className="min-w-0 pe-1">
        <span className="block text-[0.7rem] font-semibold tracking-wide text-[#c4b5fd]">
          {ATRIN_BRAND.product}
        </span>
        <span className="relative mt-0.5 block h-5 overflow-hidden text-xs text-slate-200">
          <AnimatePresence mode="wait">
            <motion.span
              key={ATRIN_LAUNCHER_ROTATIONS[index]}
              initial={reduce ? false : { y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? undefined : { y: -10, opacity: 0 }}
              transition={{ duration: 0.28 }}
              className="absolute inset-x-0 top-0 truncate"
            >
              {ATRIN_LAUNCHER_ROTATIONS[index]}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    </motion.button>
  );
}
