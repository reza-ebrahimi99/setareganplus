"use client";

import { SparkIcon } from "@/components/icons";
import { AI_HEADER } from "@/content/ai-assistant";

type AiHeaderProps = {
  onClose: () => void;
  onClear?: () => void;
};

export function AiHeader({ onClose, onClear }: AiHeaderProps) {
  return (
    <header className="flex items-start gap-3 border-b border-border bg-white/95 px-4 py-4 backdrop-blur-sm">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary shadow-sm">
        <SparkIcon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 id="ai-assistant-title" className="text-base font-bold text-primary">
          {AI_HEADER.title}
        </h2>
        <p className="mt-0.5 text-xs leading-6 text-muted">
          {AI_HEADER.subtitle}
        </p>
        <p className="mt-1 inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-success">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-success"
          />
          {AI_HEADER.statusLabel}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="پاک کردن گفتگو"
            className="inline-flex min-h-9 items-center justify-center rounded-xl border border-border bg-white px-2.5 text-[0.7rem] font-medium text-muted transition-colors hover:bg-background hover:text-primary"
          >
            پاک کردن
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label={AI_HEADER.closeLabel}
          data-ai-close
          className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-white text-muted transition-colors hover:bg-background hover:text-primary"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </header>
  );
}
