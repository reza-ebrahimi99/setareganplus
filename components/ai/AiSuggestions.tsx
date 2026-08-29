"use client";

import { AI_SUGGESTIONS } from "@/content/ai-assistant";
import { toPersianDigits } from "@/lib/persian";

type AiSuggestionsProps = {
  onSelect: (text: string) => void;
  disabled?: boolean;
};

export function AiSuggestions({ onSelect, disabled }: AiSuggestionsProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted">پیشنهاد پرسش</p>
      <ul className="flex flex-wrap gap-2">
        {AI_SUGGESTIONS.map((item) => (
          <li key={item}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(item)}
              className="inline-flex min-h-9 items-center rounded-full border border-border bg-white px-3 text-xs font-medium text-primary shadow-sm transition-colors hover:border-secondary/40 hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
            >
              {toPersianDigits(item)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
