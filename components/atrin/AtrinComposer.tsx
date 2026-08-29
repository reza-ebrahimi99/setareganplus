"use client";

import { useEffect, useRef, useState } from "react";
import {
  AtrinSmartSearch,
  pushRecentPrompt,
} from "@/components/atrin/os";
import { ATRIN_BRAND } from "@/content/atrin";
import { resolveAtrinCommand } from "@/lib/atrin/commands";

type AtrinComposerProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  focusToken?: number;
  onOpenCommands?: () => void;
};

export function AtrinComposer({
  onSend,
  disabled,
  placeholder = "هر سوالی داری بپرس...",
  autoFocus,
  focusToken = 0,
  onOpenCommands,
}: AtrinComposerProps) {
  const [value, setValue] = useState("");
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 140)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!focusToken) return;
    const node = ref.current;
    if (!node) return;
    node.focus();
    const end = node.value.length;
    node.setSelectionRange(end, end);
  }, [focusToken]);

  function submitRaw(raw: string) {
    const resolved = resolveAtrinCommand(raw) ?? raw.trim();
    if (!resolved || disabled) return;
    pushRecentPrompt(resolved);
    onSend(resolved);
    setValue("");
    setSearch("");
  }

  function submit() {
    submitRaw(value);
  }

  return (
    <form
      className="border-t border-white/10 bg-[#070b1a]/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <AtrinSmartSearch
        value={search || value}
        disabled={disabled}
        onChange={(next) => {
          setSearch(next);
          setValue(next);
        }}
        onPick={(text) => submitRaw(text)}
      />

      <div className="atrin-glass flex items-end gap-2 rounded-2xl p-2 focus-within:shadow-[0_0_0_1px_rgb(34_211_238_/_0.35),0_0_24px_rgb(124_58_237_/_0.25)]">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ATRIN_BRAND.composerLabel}
          onChange={(event) => {
            setValue(event.target.value);
            setSearch(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          className="max-h-36 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-60"
        />
        {onOpenCommands ? (
          <button
            type="button"
            onClick={onOpenCommands}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300 hover:bg-white/10"
            aria-label="فرمان‌های سریع"
            title="Ctrl+/ "
          >
            /
          </button>
        ) : null}
        <button
          type="submit"
          disabled={disabled || value.trim().length === 0}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] text-white shadow-[0_0_20px_rgb(124_58_237_/_0.45)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22d3ee]"
          aria-label="ارسال پیام"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-4 -scale-x-100"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path d="M5 12h12" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
      </div>
      <p className="mt-2 text-[0.7rem] text-slate-500">
        Enter ارسال · / فرمان · Ctrl+K پالت
      </p>
    </form>
  );
}
