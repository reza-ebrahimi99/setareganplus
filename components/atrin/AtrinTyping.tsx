"use client";

import { motion, useReducedMotion } from "framer-motion";

type AtrinTypingProps = {
  label?: string;
};

export function AtrinTyping({
  label = "آترین در حال فکر کردنه...",
}: AtrinTypingProps) {
  const reduce = useReducedMotion();

  return (
    <div
      className="atrin-typing inline-flex max-w-[min(100%,20rem)] items-center gap-3 rounded-2xl rounded-ss-md px-3.5 py-2.5"
      role="status"
      aria-live="polite"
    >
      <span className="atrin-typing-shimmer" aria-hidden />
      <span className="relative flex items-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className="size-1.5 rounded-full bg-gradient-to-br from-[#60A5FA] via-[#A78BFA] to-[#22D3EE]"
            animate={
              reduce
                ? undefined
                : {
                    opacity: [0.35, 1, 0.35],
                    y: [0, -3, 0],
                    scale: [0.9, 1.15, 0.9],
                  }
            }
            transition={{
              duration: 1.05,
              repeat: Infinity,
              delay: index * 0.16,
              ease: "easeInOut",
            }}
          />
        ))}
      </span>
      <span className="text-[0.8rem] font-medium text-slate-200">{label}</span>
    </div>
  );
}
