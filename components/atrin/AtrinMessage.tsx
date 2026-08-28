"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AtrinSmartResponse } from "@/components/atrin/os";
import { CopyButton } from "@/components/ui/CopyButton";
import type { AtrinModeId } from "@/content/atrin";
import { toPersianDigits } from "@/lib/persian";
import type { AiMessage as AiMessageType } from "@/types/ai";

type AtrinMessageProps = {
  message: AiMessageType;
  modeId: AtrinModeId;
  userQuery?: string | null;
  showRetry?: boolean;
  onRetry?: () => void;
  isLatestAssistant?: boolean;
  onEducationAction?: (prompt: string) => void;
  onChat?: (prompt: string) => void;
  disabled?: boolean;
};

function formatTime(timestamp: number): string {
  try {
    return toPersianDigits(
      new Intl.DateTimeFormat("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(timestamp)),
    );
  } catch {
    return "";
  }
}

export function AtrinMessage({
  message,
  modeId,
  userQuery = null,
  showRetry,
  onRetry,
  isLatestAssistant = false,
  onEducationAction,
  onChat,
  disabled = false,
}: AtrinMessageProps) {
  const reduce = useReducedMotion();
  const isUser = message.role === "user";
  const chatHandler = onChat ?? onEducationAction;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={`flex ${isUser ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`max-w-[96%] space-y-2 ${isUser ? "items-start" : "items-end"}`}
      >
        {isUser ? (
          <div className="rounded-2xl rounded-se-md bg-gradient-to-br from-[#2563EB] via-[#4F46E5] to-[#0E7490] px-3 py-2 text-[0.925rem] leading-7 text-white shadow-[0_8px_24px_rgb(37_99_235_/_0.22)]">
            <p className="whitespace-pre-wrap">
              {toPersianDigits(message.content)}
            </p>
          </div>
        ) : (
          <AtrinSmartResponse
            content={message.content}
            modeId={modeId}
            userQuery={userQuery}
            citations={message.citations}
            actions={message.actions}
            recommendations={message.recommendations}
            suggestions={message.suggestions}
            showEducation={Boolean(isLatestAssistant && userQuery)}
            onChat={chatHandler}
            disabled={disabled}
          />
        )}

        <div
          className={`flex flex-wrap items-center gap-2 ${
            isUser ? "justify-start" : "justify-end"
          }`}
        >
          <time className="text-[0.7rem] text-slate-500">
            {formatTime(message.createdAt)}
          </time>
          {!isUser ? (
            <CopyButton
              text={message.content}
              label="کپی پاسخ"
              className="inline-flex min-h-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2.5 text-[0.7rem] font-medium text-slate-300 hover:bg-white/10"
            />
          ) : null}
          {showRetry && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2.5 text-[0.7rem] font-medium text-[#c4b5fd] hover:bg-white/10"
            >
              تلاش مجدد
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
