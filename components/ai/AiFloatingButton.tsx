"use client";

import { useEffect, useState } from "react";
import { SparkIcon } from "@/components/icons";
import { AI_HEADER } from "@/content/ai-assistant";
import { AI_ASSISTANT_FAB_SEEN_KEY } from "@/lib/ai/assistant-config";

type AiFloatingButtonProps = {
  open: boolean;
  onOpen: () => void;
};

export function AiFloatingButton({ open, onOpen }: AiFloatingButtonProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(AI_ASSISTANT_FAB_SEEN_KEY);
      if (!seen) {
        setPulse(true);
      }
    } catch {
      setPulse(true);
    }
  }, []);

  function handleOpen() {
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
    <button
      type="button"
      onClick={handleOpen}
      title={AI_HEADER.fabTooltip}
      aria-label={AI_HEADER.fabTooltip}
      className={`ai-fab group fixed bottom-5 start-5 z-[70] inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary px-4 py-3 text-sm font-semibold text-primary shadow-[0_12px_40px_rgb(15_23_42_/_0.18)] backdrop-blur-sm transition-transform hover:-translate-y-0.5 hover:bg-secondary/92 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:bottom-6 sm:start-6 ${
        pulse ? "ai-fab-pulse" : ""
      }`}
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-primary text-secondary shadow-sm transition-transform group-hover:scale-105">
        <SparkIcon className="size-4" />
      </span>
      <span className="pe-1">{AI_HEADER.fabLabel}</span>
    </button>
  );
}
