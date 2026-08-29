"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ATRIN_COMMANDS } from "@/content/atrin";

const EXTRA_COMMANDS = [
  { id: "tuition", command: "/tuition", label: "شهریه", prompt: "شهریه" },
  { id: "math", command: "/math", label: "ریاضی", prompt: "یک سوال ریاضی دارم" },
  { id: "science", command: "/science", label: "علوم", prompt: "یک سوال علوم دارم" },
  { id: "english", command: "/english", label: "انگلیسی", prompt: "یک سوال انگلیسی دارم" },
  { id: "classes", command: "/classes", label: "کلاس", prompt: "کلاس‌ها" },
  { id: "advisor", command: "/advisor", label: "مشاور", prompt: "مشاوره تحصیلی می‌خواهم" },
] as const;

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
  const [query, setQuery] = useState("");

  const catalog = useMemo(
    () => [
      ...ATRIN_COMMANDS.map((item) => ({
        id: item.id,
        command: item.command,
        label: item.label,
        prompt: item.prompt,
      })),
      ...EXTRA_COMMANDS,
    ],
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (item) =>
        item.label.includes(query.trim()) ||
        item.command.includes(q) ||
        item.prompt.includes(query.trim()),
    );
  }, [catalog, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/55 p-4 pt-[10vh] backdrop-blur-sm">
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
            className="atrin-root atrin-glass relative z-10 w-full max-w-lg rounded-2xl p-3"
          >
            <label className="sr-only" htmlFor="atrin-command-search">
              جستجوی فرمان
            </label>
            <input
              id="atrin-command-search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جستجو: ثبت‌نام، شهریه، ریاضی، قلم‌چی…"
              className="mb-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
            />
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {filtered.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm text-slate-100 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22d3ee]"
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
              {filtered.length === 0 ? (
                <li className="px-3 py-4 text-center text-xs text-slate-500">
                  موردی پیدا نشد
                </li>
              ) : null}
            </ul>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
