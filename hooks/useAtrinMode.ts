"use client";

import { useMemo } from "react";
import { ATRIN_MODES, type AtrinModeId } from "@/content/atrin";
import { detectAtrinMode } from "@/lib/atrin/detect-mode";
import type { AiMessage } from "@/types/ai";

export function useAtrinMode(messages: readonly AiMessage[]) {
  const modeId = useMemo(() => {
    const userTexts = messages
      .filter((item) => item.role === "user")
      .map((item) => item.content);
    return detectAtrinMode(userTexts);
  }, [messages]);

  const mode = ATRIN_MODES[modeId];

  return { modeId, mode } as {
    modeId: AtrinModeId;
    mode: (typeof ATRIN_MODES)[AtrinModeId];
  };
}
