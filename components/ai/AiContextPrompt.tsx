"use client";

import { usePathname } from "next/navigation";
import { getAiContextPrompt } from "@/content/ai-assistant";
import { toPersianDigits } from "@/lib/persian";

type AiContextPromptProps = {
  visible: boolean;
};

/** UI-only contextual first question based on current public route. */
export function AiContextPrompt({ visible }: AiContextPromptProps) {
  const pathname = usePathname();

  if (!visible) return null;

  return (
    <p className="border-b border-border bg-secondary/10 px-4 py-3 text-sm font-medium leading-7 text-primary">
      {toPersianDigits(getAiContextPrompt(pathname))}
    </p>
  );
}
