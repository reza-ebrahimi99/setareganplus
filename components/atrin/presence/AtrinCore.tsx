"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AtrinMark } from "@/components/atrin/AtrinMark";

type AtrinCoreProps = {
  className?: string;
  thinking?: boolean;
};

/**
 * Animated glass AI presence — CSS + Framer Motion only.
 */
export function AtrinCore({ className = "", thinking }: AtrinCoreProps) {
  const reduce = useReducedMotion();

  return (
    <div
      className={`relative mx-auto aspect-square w-full max-w-[22rem] ${className}`}
      aria-hidden
    >
      {/* Breathing aura */}
      <motion.div
        className="absolute inset-[-6%] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.35),transparent_65%)]"
        animate={
          reduce
            ? undefined
            : { scale: [1, 1.06, 1], opacity: [0.55, 0.85, 0.55] }
        }
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.22),transparent_60%)]"
        animate={
          reduce
            ? undefined
            : { scale: [1.04, 0.96, 1.04], opacity: [0.4, 0.7, 0.4] }
        }
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orbit ring */}
      <motion.div
        className="absolute inset-[12%] rounded-full border border-white/10"
        style={{
          background:
            "conic-gradient(from 90deg, transparent, rgba(124,58,237,0.35), transparent, rgba(34,211,238,0.3), transparent)",
        }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-[22%] rounded-full border border-dashed border-cyan-300/20"
        animate={reduce ? undefined : { rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />

      {/* Soft particles */}
      {!reduce
        ? Array.from({ length: 10 }).map((_, index) => {
            const angle = (index / 10) * Math.PI * 2;
            const radius = 42 + (index % 3) * 6;
            const x = 50 + Math.cos(angle) * radius;
            const y = 50 + Math.sin(angle) * radius;
            return (
              <motion.span
                key={index}
                className="absolute size-1.5 rounded-full bg-white/70 shadow-[0_0_10px_rgba(167,139,250,0.8)]"
                style={{ left: `${x}%`, top: `${y}%` }}
                animate={{
                  opacity: [0.2, 1, 0.2],
                  scale: [0.8, 1.3, 0.8],
                }}
                transition={{
                  duration: 2.4 + (index % 4) * 0.4,
                  repeat: Infinity,
                  delay: index * 0.18,
                }}
              />
            );
          })
        : null}

      {/* Floating educational symbols */}
      {!reduce
        ? [
            { label: "∑", x: "12%", y: "18%", delay: 0 },
            { label: "π", x: "78%", y: "22%", delay: 0.4 },
            { label: "A", x: "18%", y: "72%", delay: 0.8 },
            { label: "★", x: "80%", y: "68%", delay: 1.1 },
          ].map((item) => (
            <motion.span
              key={item.label}
              className="absolute text-sm font-semibold text-white/35"
              style={{ left: item.x, top: item.y }}
              animate={{ y: [0, -8, 0], opacity: [0.25, 0.55, 0.25] }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                delay: item.delay,
                ease: "easeInOut",
              }}
            >
              {item.label}
            </motion.span>
          ))
        : null}

      {/* Glass core */}
      <div className="atrin-glass absolute inset-[28%] flex items-center justify-center rounded-[2rem] shadow-[0_0_50px_rgba(124,58,237,0.35)]">
        <motion.div
          animate={
            reduce
              ? undefined
              : thinking
                ? { scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }
                : { scale: [1, 1.03, 1] }
          }
          transition={{
            duration: thinking ? 1.4 : 3.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <AtrinMark size="lg" className="!shadow-none" />
        </motion.div>
        <span className="absolute bottom-3 inline-flex items-center gap-1.5 rounded-full bg-black/30 px-2 py-0.5 text-[0.65rem] text-emerald-300">
          <span className="atrin-online-dot size-1.5 rounded-full bg-emerald-400" />
          آنلاین
        </span>
      </div>
    </div>
  );
}
