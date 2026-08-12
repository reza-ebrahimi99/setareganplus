"use client";

import { useEffect, useRef, useState } from "react";
import { AI_HEADER } from "@/content/ai-assistant";

type AiComposerProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function AiComposer({
  onSend,
  disabled,
  placeholder = "سؤال خود را بنویسید…",
}: AiComposerProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 140)}px`;
  }, [value]);

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  }

  return (
    <form
      className="border-t border-border bg-white/95 p-3 backdrop-blur-sm"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 shadow-sm focus-within:border-secondary/40">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={AI_HEADER.composerLabel}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          className="max-h-36 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-foreground outline-none placeholder:text-muted disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || value.trim().length === 0}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary shadow-sm transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="ارسال"
        >
          <svg
            aria-hidden="true"
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
      <p className="mt-2 text-[0.7rem] text-muted">
        Enter برای ارسال · Shift+Enter خط جدید
      </p>
    </form>
  );
}
