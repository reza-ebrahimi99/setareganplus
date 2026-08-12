"use client";

import type { MouseEvent } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
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
  const [captionIndex, setCaptionIndex] = useState(0);

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
    if (reduce || open) return;
    const timer = window.setInterval(() => {
      setCaptionIndex((prev) => (prev + 1) % ATRIN_LAUNCHER_ROTATIONS.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [reduce, open]);

  function handleOpen(_event: MouseEvent<HTMLButtonElement>) {
    setPulse(false);
    try {
      window.localStorage.setItem(AI_ASSISTANT_FAB_SEEN_KEY, "1");
    } catch {
      // ignore
    }
    onOpen();
  }

  if (open) return null;

  const caption = ATRIN_LAUNCHER_ROTATIONS[captionIndex] ?? ATRIN_LAUNCHER_ROTATIONS[0];

  return (
    <motion.button
      type="button"
      onClick={handleOpen}
      aria-label={ATRIN_BRAND.fabAria}
      title={ATRIN_BRAND.name}
      initial={false}
      animate={
        reduce
          ? { opacity: 1, y: 0 }
          : { opacity: 1, y: [0, -2, 0] }
      }
      transition={
        reduce
          ? { duration: 0.2 }
          : {
              y: { duration: 4.2, repeat: Infinity, ease: "easeInOut" },
            }
      }
      whileHover={reduce ? undefined : { scale: 1.02 }}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      style={{
        opacity: 1,
        paddingBottom: "max(0.65rem, env(safe-area-inset-bottom))",
        paddingInlineStart: "max(0.25rem, env(safe-area-inset-left))",
      }}
      className={`atrin-launcher-invite atrin-root fixed bottom-5 start-5 z-[70] inline-flex max-w-[min(92vw,17.5rem)] items-center gap-3 overflow-hidden rounded-[1.35rem] px-3.5 py-3 text-start sm:bottom-6 sm:start-6 ${
        pulse ? "atrin-launcher-pulse" : ""
      }`}
    >
      <AtrinMark size="md" className="relative z-[1] shrink-0" />

      <span className="relative z-[1] min-w-0 pe-1">
        <span className="block text-[1rem] font-bold leading-6 tracking-tight text-white">
          {ATRIN_BRAND.name}
        </span>
        <span className="mt-0.5 block min-h-[1.25rem] overflow-hidden text-[0.72rem] font-medium text-slate-200/90">
          <AnimatePresence mode="sync" initial={false}>
            <motion.span
              key={caption}
              className="block"
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {caption}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    </motion.button>
  );
}
