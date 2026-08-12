"use client";

import { AiMarkdown } from "@/components/ai/AiMarkdown";
import { AiActionCards } from "@/components/ai/actions";
import { AtrinBadge, AtrinCard } from "@/components/atrin/ui";
import { ATRIN_MODES, type AtrinModeId } from "@/content/atrin";

type AtrinSmartResponseProps = {
  content: string;
  modeId: AtrinModeId;
  userQuery?: string | null;
  highlights?: readonly string[];
};

function buildHighlights(content: string): string[] {
  const lines = content
    .split("\n")
    .map((line) => line.replace(/^[-*•\d.\s]+/, "").trim())
    .filter((line) => line.length > 12 && line.length < 90);
  return lines.slice(0, 3);
}

export function AtrinSmartResponse({
  content,
  modeId,
  userQuery,
  highlights,
}: AtrinSmartResponseProps) {
  const mode = ATRIN_MODES[modeId];
  const bullets = highlights ?? buildHighlights(content);

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <AtrinBadge color={mode.accent}>{mode.label}</AtrinBadge>
        <span className="text-[0.65rem] text-slate-500">چیدمان هوشمند</span>
      </div>

      <AtrinCard
        className={`!p-3.5 bg-gradient-to-br ${mode.gradient} !border-0`}
        hover={false}
      >
        <p className="text-xs font-semibold text-white/90">پاسخ آترین</p>
        <p className="mt-1 text-[0.7rem] text-white/70">{mode.tip}</p>
      </AtrinCard>

      <div className="atrin-glass rounded-2xl rounded-ss-md px-3.5 py-2.5 text-sm leading-7 text-slate-100">
        <AiMarkdown content={content} />
      </div>

      {bullets.length > 0 ? (
        <AtrinCard hover={false} className="!p-3">
          <p className="text-[0.7rem] font-semibold text-[#c4b5fd]">نکات برجسته</p>
          <ul className="mt-2 space-y-1.5">
            {bullets.map((item) => (
              <li key={item} className="text-xs leading-6 text-slate-300">
                • {item}
              </li>
            ))}
          </ul>
        </AtrinCard>
      ) : null}

      <AiActionCards query={userQuery} response={content} />

      <p className="text-[0.65rem] text-slate-500">
        منابع: دانش مؤسسه و صفحات سایت (نمایشی)
      </p>
    </div>
  );
}
