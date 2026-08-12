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
    <div className="space-y-3" aria-label="شروع سریع آترین">
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {ATRIN_QUICK_QUESTIONS.map((item, index) => (
          <motion.li
            key={item.id}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: Math.min(index * 0.04, 0.2),
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <motion.button
              type="button"
              disabled={disabled}
              onClick={(event) => handleSelect(event, item.id)}
              whileHover={reduce || disabled ? undefined : { y: -1.5 }}
              whileTap={reduce || disabled ? undefined : { scale: 0.985 }}
              className={`${CARD_TONES[index % CARD_TONES.length]} relative w-full justify-start disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span aria-hidden className="text-lg leading-none">
                {item.emoji}
              </span>
              <span className="font-semibold leading-6">{item.label}</span>
            </motion.button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
