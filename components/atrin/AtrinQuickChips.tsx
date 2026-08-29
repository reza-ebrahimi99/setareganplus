"use client";

import type { MouseEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ATRIN_QUICK_QUESTIONS,
  type AtrinQuickChipId,
} from "@/content/atrin";

type AtrinQuickChipsProps = {
  onSelect: (chipId: AtrinQuickChipId) => void;
  disabled?: boolean;
  visible?: boolean;
};

const CARD_TONES = [
  "atrin-welcome-card atrin-welcome-card--violet",
  "atrin-welcome-card atrin-welcome-card--cyan",
  "atrin-welcome-card atrin-welcome-card--emerald",
  "atrin-welcome-card atrin-welcome-card--amber",
  "atrin-welcome-card atrin-welcome-card--rose",
  "atrin-welcome-card atrin-welcome-card--sky",
] as const;

export function AtrinQuickChips({
  onSelect,
  disabled,
  visible = true,
}: AtrinQuickChipsProps) {
  const reduce = useReducedMotion();

  if (!visible) return null;

  function handleSelect(
    _event: MouseEvent<HTMLButtonElement>,
    chipId: AtrinQuickChipId,
  ) {
    onSelect(chipId);
  }

  return (
    <div className="space-y-3" aria-label="مسیرهای شروع آترین">
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {ATRIN_QUICK_QUESTIONS.map((item, index) => (
          <motion.li
            key={item.id}
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: Math.min(0.08 + index * 0.05, 0.38),
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="h-full"
          >
            <motion.button
              type="button"
              disabled={disabled}
              onClick={(event) => handleSelect(event, item.id)}
              whileHover={
                reduce || disabled ? undefined : { y: -3, scale: 1.015 }
              }
              whileTap={reduce || disabled ? undefined : { scale: 0.985 }}
              className={`${CARD_TONES[index % CARD_TONES.length]} relative h-full min-h-[4.25rem] w-full justify-start disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span
                aria-hidden
                className="atrin-welcome-card__icon flex size-10 shrink-0 items-center justify-center text-xl leading-none"
              >
                {item.emoji}
              </span>
              <span className="text-[0.92rem] font-semibold leading-6 tracking-tight">
                {item.label}
              </span>
            </motion.button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
