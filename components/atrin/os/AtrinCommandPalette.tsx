"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ATRIN_COMMANDS } from "@/content/atrin";

type AtrinCommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (prompt: string) => void;
};

export function AtrinCommandPalette({
  open,
  onClose,
  onSelect,
}: AtrinCommandPaletteProps) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="بستن فرمان‌ها"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="فرمان‌های سریع آترین"
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            className="atrin-root atrin-glass relative z-10 w-full max-w-md rounded-2xl p-3"
          >
            <p className="px-2 pb-2 text-sm font-bold text-white">
              فرمان سریع
            </p>
            <ul className="space-y-1">
              {ATRIN_COMMANDS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm text-slate-100 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22d3ee]"
                    onClick={() => {
                      onSelect(item.prompt);
                      onClose();
                    }}
                  >
                    <span>{item.label}</span>
                    <span className="text-xs text-slate-500">{item.command}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
