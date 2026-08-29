"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ATRIN_COMMANDS, ATRIN_PROMPT_GROUPS } from "@/content/atrin";
import { filterAtrinCommands } from "@/lib/atrin/commands";

const RECENT_KEY = "atrin-recent-prompts-v1";

type AtrinSmartSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onPick: (text: string) => void;
  disabled?: boolean;
};

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").slice(0, 6)
      : [];
  } catch {
    return [];
  }
}

export function pushRecentPrompt(text: string) {
  if (typeof window === "undefined") return;
  try {
    const next = [text, ...loadRecent().filter((item) => item !== text)].slice(
      0,
      6,
    );
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function AtrinSmartSearch({
  value,
  onChange,
  onPick,
  disabled,
}: AtrinSmartSearchProps) {
  const reduce = useReducedMotion();
  const [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  const commands = useMemo(() => filterAtrinCommands(value), [value]);
  const popular = useMemo(
    () => ATRIN_PROMPT_GROUPS.flatMap((group) => group.prompts).slice(0, 8),
    [],
  );

  const show =
    open &&
    !disabled &&
    (value.startsWith("/") || value.length === 0 || value.length >= 1);

  return (
    <div className="relative">
      <AnimatePresence>
        {show ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 4 }}
            className="absolute inset-x-0 bottom-full z-20 mb-2 max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1024]/95 p-2 shadow-[0_16px_40px_rgb(0_0_0_/_0.45)] backdrop-blur-xl"
            onMouseDown={(event) => event.preventDefault()}
          >
            {commands.length > 0 ? (
              <div className="mb-2">
                <p className="px-2 pb-1 text-[0.65rem] text-slate-500">
                  فرمان‌های سریع
                </p>
                {commands.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-start text-xs text-slate-200 hover:bg-white/10"
                    onClick={() => {
                      onPick(item.prompt);
                      setOpen(false);
                    }}
                  >
                    <span>{item.label}</span>
                    <span className="text-slate-500">{item.command}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {recent.length > 0 && !value.startsWith("/") ? (
              <div className="mb-2">
                <p className="px-2 pb-1 text-[0.65rem] text-slate-500">اخیر</p>
                {recent.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="block w-full rounded-xl px-2 py-2 text-start text-xs text-slate-200 hover:bg-white/10"
                    onClick={() => {
                      onPick(item);
                      setOpen(false);
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}

            {!value.startsWith("/") ? (
              <div>
                <p className="px-2 pb-1 text-[0.65rem] text-slate-500">
                  پرتکرار
                </p>
                <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                  {popular.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="atrin-chip !min-h-8 !px-2.5 !text-[0.7rem]"
                      onClick={() => {
                        onChange(item);
                        onPick(item);
                        setOpen(false);
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <p className="px-2 pt-1 text-[0.65rem] text-slate-600">
                  فرمان‌ها: {ATRIN_COMMANDS.map((c) => c.command).join(" ")}
                </p>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <input
        type="search"
        value={value}
        disabled={disabled}
        placeholder="جستجو یا /فرمان…"
        aria-label="جستجوی هوشمند آترین"
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        className="mb-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
      />
    </div>
  );
}
