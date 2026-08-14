"use client";

import { AiMarkdown } from "@/components/ai/AiMarkdown";
import { AiCitations } from "@/components/ai/AiCitations";
import { AiActionCards } from "@/components/ai/actions";
import { EducationPanel } from "@/components/atrin/education";
import type { AtrinModeId } from "@/content/atrin";
import type { AiAction, AiRecommendation } from "@/types/ai-actions";
import type { AiCitation } from "@/types/ai-citations";

type AtrinSmartResponseProps = {
  content: string;
  modeId: AtrinModeId;
  userQuery?: string | null;
  highlights?: readonly string[];
  citations?: readonly AiCitation[];
  actions?: readonly AiAction[];
  recommendations?: readonly AiRecommendation[];
  suggestions?: readonly AiAction[];
  showEducation?: boolean;
  onChat?: (prompt: string) => void;
  disabled?: boolean;
};

/**
 * Extract up to 2 highlight bullets only when the reply already uses list-like structure.
 */
function buildHighlights(
  content: string,
  provided?: readonly string[],
): string[] {
  if (provided && provided.length > 0) {
    return [...provided].slice(0, 2);
  }

  const bullets = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^([-•*]|\d+[.)])\s+/.test(line))
    .map((line) => line.replace(/^([-•*]|\d+[.)])\s+/, "").trim())
    .filter((line) => line.length >= 8 && line.length <= 120);

  return [...new Set(bullets)].slice(0, 2);
}

/**
 * Flagship answer layout:
 * Answer → highlights → education coach → citations → actions → follow-up chips
 */
export function AtrinSmartResponse({
  content,
  modeId,
  userQuery,
  highlights,
  citations = [],
  suggestions = [],
  showEducation = false,
  onChat,
  disabled = false,
}: AtrinSmartResponseProps) {
  const bullets = buildHighlights(content, highlights);
  const isLeadPrompt =
    /اسمت چیه|پایه‌ات چنده|هدفت چیه|هدفت از مسیر|دنبال کدوم مسیر/.test(
      content,
    );

  const followUps = suggestions
    .filter((item) => Boolean(item.label?.trim()))
    .slice(0, 3);

  return (
    <div className="w-full max-w-[34rem] space-y-3">
      <div className="atrin-assistant-bubble atrin-glass rounded-2xl rounded-ss-md px-3 py-2.5 text-[0.925rem] leading-7 text-slate-50">
        <AiMarkdown content={content} />
      </div>

      {!isLeadPrompt && bullets.length > 0 ? (
        <ul className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
          {bullets.map((item) => (
            <li key={item} className="text-xs leading-6 text-slate-300">
              <span className="me-1.5 text-cyan-300/90" aria-hidden>
                •
              </span>
              {item}
            </li>
          ))}
        </ul>
      ) : null}

      {showEducation && userQuery ? (
        <EducationPanel query={userQuery} onAction={onChat} />
      ) : null}

      {!isLeadPrompt && citations.length > 0 ? (
        <AiCitations citations={citations} />
      ) : null}

      {!isLeadPrompt ? (
        <AiActionCards
          query={userQuery}
          response={content}
          onChat={onChat}
          disabled={disabled}
        />
      ) : null}

      {!isLeadPrompt && followUps.length > 0 && onChat ? (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="پیشنهاد ادامه گفتگو"
        >
          {followUps.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (item.href) {
                  if (typeof window !== "undefined") {
                    window.location.assign(item.href);
                  }
                  return;
                }
                onChat(item.label);
              }}
              className="atrin-followup-chip inline-flex min-h-9 items-center rounded-full border border-white/12 bg-white/[0.05] px-3 text-[0.72rem] font-medium text-slate-200 transition hover:border-cyan-400/35 hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {modeId !== "general" && !isLeadPrompt ? (
        <p className="text-[0.65rem] tracking-wide text-slate-500">
          حالت فعال:{" "}
          <span className="text-cyan-300/80">
            {modeId === "study"
              ? "معلم هوشمند"
              : modeId === "parent"
                ? "مشاور والدین"
                : modeId === "admissions"
                  ? "پذیرش"
                  : modeId === "counselor"
                    ? "مشاور تحصیلی"
                    : modeId === "gifted"
                      ? "تیزهوشان"
                      : modeId === "career"
                        ? "انتخاب مسیر"
                        : modeId === "qalamchi"
                          ? "قلم‌چی"
                          : modeId === "summer"
                            ? "تابستان"
                            : modeId === "school"
                              ? "راهنمای مدرسه"
                              : "عمومی"}
          </span>
        </p>
      ) : null}
    </div>
  );
}
