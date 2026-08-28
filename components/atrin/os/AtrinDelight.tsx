"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

type Delight = {
  id: string;
  text: string;
};

type AtrinDelightProps = {
  message: Delight | null;
  onDone?: () => void;
};

export function AtrinDelight({ message, onDone }: AtrinDelightProps) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => onDone?.(), 2800);
    return () => window.clearTimeout(timer);
  }, [message, onDone]);

  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          role="status"
          aria-live="polite"
          initial={reduce ? false : { opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: 8 }}
          className="pointer-events-none fixed bottom-24 start-1/2 z-[95] -translate-x-1/2 rounded-full border border-white/15 bg-[#0b1024]/90 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_30px_rgba(124,58,237,0.35)] backdrop-blur-xl"
        >
          {message.text}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function useAtrinDelight() {
  const [message, setMessage] = useState<Delight | null>(null);

  function celebrate(text: string) {
    setMessage({ id: `${Date.now()}`, text });
  }

  return {
    message,
    celebrate,
    clear: () => setMessage(null),
  };
}
