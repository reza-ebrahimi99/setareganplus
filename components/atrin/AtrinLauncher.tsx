"use client";

import type { MouseEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { AtrinMark } from "@/components/atrin/AtrinMark";
import { ATRIN_BRAND, ATRIN_LAUNCHER_CTA } from "@/content/atrin";
import { AI_ASSISTANT_FAB_SEEN_KEY } from "@/lib/ai/assistant-config";

type AtrinLauncherProps = {
  open: boolean;
  onOpen: () => void;
};

type Particle = {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
};

const PARTICLES: Particle[] = [
  { id: 1, x: 18, y: 22, size: 2.2, delay: 0, duration: 3.6 },
  { id: 2, x: 72, y: 28, size: 1.6, delay: 0.8, duration: 4.2 },
  { id: 3, x: 88, y: 58, size: 1.9, delay: 1.4, duration: 3.8 },
  { id: 4, x: 42, y: 68, size: 1.4, delay: 0.4, duration: 4.6 },
  { id: 5, x: 58, y: 16, size: 1.7, delay: 1.1, duration: 3.4 },
];

export function AtrinLauncher({ open, onOpen }: AtrinLauncherProps) {
  const reduce = useReducedMotion();
  const [pulse, setPulse] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>(
    [],
  );
  const [magnet, setMagnet] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const id = window.requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        const seen = window.localStorage.getItem(AI_ASSISTANT_FAB_SEEN_KEY);
        if (!seen) setPulse(true);
      } catch {
        setPulse(true);
      }
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
    };
  }, []);

  function handlePointerMove(event: MouseEvent<HTMLButtonElement>) {
    if (reduce) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    setMagnet({ x: px * 6, y: py * 4 });
  }

  function handlePointerLeave() {
    setMagnet({ x: 0, y: 0 });
  }

  function handleOpen(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x, y }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((item) => item.id !== id));
    }, 650);

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
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      aria-label={ATRIN_BRAND.fabAria}
      title={ATRIN_BRAND.name}
      initial={false}
      animate={
        reduce
          ? { opacity: 1, x: 0, y: 0, rotate: 0 }
          : {
              opacity: 1,
              x: magnet.x,
              y: magnet.y,
              rotate: [0, -1.6, 1.4, 0],
            }
      }
      transition={
        reduce
          ? { duration: 0.2 }
          : {
              x: { type: "spring", stiffness: 260, damping: 22 },
              y: { type: "spring", stiffness: 260, damping: 22 },
              rotate: { duration: 7.5, repeat: Infinity, ease: "easeInOut" },
            }
      }
      whileHover={reduce ? undefined : { scale: 1.035 }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      style={{
        width: "auto",
        maxWidth: "min(270px, calc(100vw - 2rem))",
        height: 56,
        borderRadius: 9999,
        bottom: "max(1.25rem, env(safe-area-inset-bottom))",
        insetInlineStart: "max(1.25rem, env(safe-area-inset-left))",
      }}
      className={`atrin-launcher-capsule atrin-root fixed z-[70] inline-flex max-w-[min(270px,calc(100vw-2rem))] items-center gap-3 overflow-hidden px-3.5 text-start sm:h-[74px] ${
        pulse ? "atrin-launcher-capsule--pulse" : ""
      }`}
    >
      {/* Breathing glow layer */}
      <span aria-hidden className="atrin-launcher-capsule__breath" />

      {/* Glass reflection */}
      <span aria-hidden className="atrin-launcher-capsule__reflection" />

      {/* Light sweep */}
      {!reduce ? <span aria-hidden className="atrin-launcher-capsule__sweep" /> : null}

      {/* Floating particles */}
      {!reduce
        ? PARTICLES.map((particle) => (
            <motion.span
              key={particle.id}
              aria-hidden
              className="atrin-launcher-capsule__particle"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: particle.size,
                height: particle.size,
              }}
              animate={{
                y: [0, -5, 0],
                opacity: [0.15, 0.7, 0.15],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))
        : null}

      {/* Ripple clicks */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          aria-hidden
          className="atrin-launcher-capsule__ripple"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}

      <AtrinMark size="md" className="relative z-[2] shrink-0" />

      <span className="relative z-[2] min-w-0 pe-1">
        <span className="block text-[1.125rem] font-bold leading-7 tracking-tight text-white">
          {ATRIN_BRAND.name}
        </span>
        <span className="mt-0.5 block truncate text-[0.8rem] font-medium leading-5 text-slate-100/95">
          {ATRIN_LAUNCHER_CTA}
        </span>
      </span>
    </motion.button>
  );
}
