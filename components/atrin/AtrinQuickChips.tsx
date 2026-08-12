"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ATRIN_QUICK_QUESTIONS } from "@/content/atrin";

type AtrinQuickChipsProps = {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  visible?: boolean;
};

export function AtrinQuickChips({
  onSelect,
  disabled,
  visible = true,
}: AtrinQuickChipsProps) {
  const reduce = useReducedMotion();
  if (!visible) return null;

  return (
    <div className="space-y-2" aria-label="سؤالات سریع">
      <p className="text-[0.7rem] font-medium tracking-wide text-[#94a3b8]">
        شروع سریع
      </p>
      <ul className="flex flex-wrap gap-2">
        {ATRIN_QUICK_QUESTIONS.map((item, index) => (
          <motion.li
            key={item.id}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.25 }}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(item.prompt)}
              className="atrin-chip disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
