"use client";

import { AiActionCards } from "@/components/ai/actions";
import { AiCitations } from "@/components/ai/AiCitations";
import { AiMarkdown } from "@/components/ai/AiMarkdown";
import { CopyButton } from "@/components/ui/CopyButton";
import { toPersianDigits } from "@/lib/persian";
import type { AiMessage as AiMessageType } from "@/types/ai";

type AiMessageProps = {
  message: AiMessageType;
  onRetry?: () => void;
  showRetry?: boolean;
  /** Preceding user query — drives website action cards (UX only). */
  userQuery?: string | null;
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

export function AiMessage({
  message,
  onRetry,
  showRetry,
  userQuery = null,
}: AiMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[92%] space-y-2 ${
          isUser ? "items-start" : "items-end"
        }`}
      >
        <div
          className={
            isUser
              ? "rounded-2xl rounded-se-md bg-primary px-3.5 py-2.5 text-sm leading-7 text-white shadow-sm"
              : "rounded-2xl rounded-ss-md border border-border bg-white px-3.5 py-2.5 text-sm leading-7 text-foreground shadow-sm"
          }
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{toPersianDigits(message.content)}</p>
          ) : (
            <AiMarkdown content={message.content} />
          )}
        </div>
        <div
          className={`flex flex-wrap items-center gap-2 ${
            isUser ? "justify-start" : "justify-end"
          }`}
        >
          <time className="text-[0.7rem] text-muted">
            {formatTime(message.createdAt)}
          </time>
          {!isUser ? (
            <CopyButton
              text={message.content}
              label="کپی پاسخ"
              className="inline-flex min-h-8 items-center justify-center rounded-lg border border-border bg-white px-2.5 text-[0.7rem] font-medium text-muted hover:bg-background"
            />
          ) : null}
          {showRetry && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-8 items-center justify-center rounded-lg border border-border bg-white px-2.5 text-[0.7rem] font-medium text-primary hover:bg-background"
            >
              تلاش مجدد
            </button>
          ) : null}
        </div>
        {!isUser ? (
          <>
            <AiCitations citations={message.citations} />
            <AiActionCards query={userQuery} response={message.content} />
          </>
        ) : null}
      </div>
    </div>
  );
}
