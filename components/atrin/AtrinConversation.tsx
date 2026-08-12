"use client";

import { useEffect, useRef } from "react";
import { AiError } from "@/components/ai/AiError";
import { AiTyping } from "@/components/ai/AiTyping";
import { AtrinHero } from "@/components/atrin/AtrinHero";
import { AtrinMessage } from "@/components/atrin/AtrinMessage";
import { AtrinQuickChips } from "@/components/atrin/AtrinQuickChips";
import { AtrinMemoryPanel } from "@/components/atrin/os";
import { AtrinTip } from "@/components/atrin/ui";
import { ATRIN_MODES, type AtrinModeId } from "@/content/atrin";
import type { AtrinMemoryFact } from "@/lib/atrin/memory";
import type { AiChatError, AiMessage as AiMessageType } from "@/types/ai";

type AtrinConversationProps = {
  messages: AiMessageType[];
  modeId: AtrinModeId;
  isLoading: boolean;
  error: AiChatError | null;
  showHero: boolean;
  memoryFacts: AtrinMemoryFact[];
  onRemoveMemory: (id: string) => void;
  onClearMemory: () => void;
  onSend: (text: string) => void;
  onRetry: () => void;
  onStartChat: () => void;
};

export function AtrinConversation({
  messages,
  modeId,
  isLoading,
  error,
  showHero,
  memoryFacts,
  onRemoveMemory,
  onClearMemory,
  onSend,
  onRetry,
  onStartChat,
}: AtrinConversationProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const mode = ATRIN_MODES[modeId];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading, error, showHero]);

  const lastAssistantIndex = [...messages]
    .map((item, index) => ({ item, index }))
    .reverse()
    .find(
      (entry) =>
        entry.item.role === "assistant" && entry.item.id !== "welcome",
    )?.index;

  const visibleMessages = showHero
    ? []
    : messages.filter((item) => item.id !== "welcome");

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="space-y-4">
        {showHero ? (
          <>
            <AtrinHero visible onStart={onStartChat} />
            <AtrinQuickChips onSelect={onSend} disabled={isLoading} />
          </>
        ) : (
          <>
            <AtrinTip accent={mode.accent}>{mode.tip}</AtrinTip>
            <AtrinMemoryPanel
              facts={memoryFacts}
              onRemove={onRemoveMemory}
              onClear={onClearMemory}
            />
            {visibleMessages.map((message, index) => {
              const previous = index > 0 ? visibleMessages[index - 1] : null;
              const userQuery =
                message.role === "assistant" && previous?.role === "user"
                  ? previous.content
                  : null;
              const absoluteIndex = messages.findIndex(
                (item) => item.id === message.id,
              );

              return (
                <AtrinMessage
                  key={message.id}
                  message={message}
                  modeId={modeId}
                  userQuery={userQuery}
                  isLatestAssistant={absoluteIndex === lastAssistantIndex}
                  showRetry={
                    Boolean(error) && absoluteIndex === lastAssistantIndex
                  }
                  onRetry={onRetry}
                />
              );
            })}

            {!isLoading && visibleMessages.length === 0 ? (
              <AtrinQuickChips onSelect={onSend} disabled={isLoading} />
            ) : null}
          </>
        )}

        {isLoading ? (
          <div className="text-slate-300">
            <AiTyping label="آترین در حال فکر کردن…" />
          </div>
        ) : null}

        {error ? (
          <AiError
            message={error.message}
            onRetry={onRetry}
            disabled={isLoading}
          />
        ) : null}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
