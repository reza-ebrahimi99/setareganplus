"use client";

import { AtrinMark } from "@/components/atrin/AtrinMark";
import { ATRIN_BRAND } from "@/content/atrin";
import type { AtrinModeId } from "@/content/atrin";

type AtrinHeaderProps = {
  modeId: AtrinModeId;
  onClose: () => void;
  onClear?: () => void;
  hideClose?: boolean;
  compact?: boolean;
};

export function AtrinHeader({
  onClose,
  onClear,
  hideClose,
  compact = false,
}: AtrinHeaderProps) {
  return (
    <header
      className={`relative z-10 flex items-center gap-3 border-b border-white/10 px-4 ${
        compact ? "py-3" : "py-4"
      }`}
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
      }}
    >
      <AtrinMark size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold text-white">{ATRIN_BRAND.name}</h2>
          <p className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-emerald-400">
            <span
              aria-hidden
              className="atrin-online-dot size-1.5 rounded-full bg-emerald-400"
            />
            {ATRIN_BRAND.statusOnline}
          </p>
        </div>
        {!compact ? (
          <p className="mt-0.5 text-xs leading-6 text-slate-400">
            {ATRIN_BRAND.subtitle}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            aria-label={ATRIN_BRAND.clearLabel}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2.5 text-[0.7rem] font-medium text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e8f9]"
          >
            پاک کردن
          </button>
        ) : null}
        {!hideClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={ATRIN_BRAND.closeLabel}
            data-atrin-close
            className="inline-flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e8f9]"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        ) : null}
      </div>
    </header>
  );
}
