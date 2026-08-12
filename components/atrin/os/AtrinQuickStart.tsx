"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ATRIN_QUICK_START } from "@/lib/atrin/greetings";
import type { AtrinProfile } from "@/lib/atrin/profile";

type AtrinQuickStartProps = {
  profile: AtrinProfile;
  onSelect: (prompt: string) => void;
};

export function AtrinQuickStart({ profile, onSelect }: AtrinQuickStartProps) {
  const reduce = useReducedMotion();

  return (
    <div className="space-y-4" aria-label="شروع سریع">
      {profile.recentPrompts.length > 0 ? (
        <div>
          <p className="mb-2 text-[0.7rem] font-medium text-slate-400">
            ادامه گفتگو / اخیر
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.recentPrompts.slice(0, 4).map((item, index) => (
              <motion.button
                key={item}
                type="button"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSelect(item)}
                className="atrin-chip"
              >
                {item}
              </motion.button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-[0.7rem] font-medium text-slate-400">
          پیشنهادهای امروز
        </p>
        <div className="flex flex-wrap gap-2">
          {ATRIN_QUICK_START.map((item, index) => (
            <motion.button
              key={item.id}
              type="button"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + index * 0.04 }}
              whileHover={reduce ? undefined : { y: -2, scale: 1.02 }}
              onClick={() => onSelect(item.prompt)}
              className="atrin-chip"
            >
              <span aria-hidden>{item.emoji}</span>
              <span>{item.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
