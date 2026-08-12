"use client";

import { useEffect, useRef } from "react";
import { AiError } from "@/components/ai/AiError";
import { AtrinHero } from "@/components/atrin/AtrinHero";
import { AtrinMessage } from "@/components/atrin/AtrinMessage";
import { AtrinQuickChips } from "@/components/atrin/AtrinQuickChips";
import { AtrinTyping } from "@/components/atrin/AtrinTyping";
import type { AtrinModeId, AtrinQuickChipId } from "@/content/atrin";
import type { AtrinMemoryFact } from "@/lib/atrin/memory";
import type { AiChatError, AiMessage as AiMessageType } from "@/types/ai";

type AtrinConversationProps = {
  messages: AiMessageType[];
  modeId: AtrinModeId;
  isLoading: boolean;
  error: AiChatError | null;
  showWelcome: boolean;
  memoryFacts: AtrinMemoryFact[];
  onRemoveMemory: (id: string) => void;
  onClearMemory: () => void;
  onSend: (text: string) => void;
  onRetry: () => void;
  onChip: (chipId: AtrinQuickChipId) => void;
};

export function AtrinConversation({
  messages,
  modeId,
  isLoading,
  error,
  showWelcome,
  onSend,
  onRetry,
  onChip,
}: AtrinConversationProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading, error, showWelcome]);

  const lastAssistantIndex = [...messages]
    .map((item, index) => ({ item, index }))
    .reverse()
    .find(
      (entry) =>
        entry.item.role === "assistant" && entry.item.id !== "welcome",
    )?.index;

  const visibleMessages = showWelcome
    ? []
    : messages.filter((item) => item.id !== "welcome");

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-4"
      style={{
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="space-y-4">
        {showWelcome ? (
          <>
            <AtrinHero visible />
            <AtrinQuickChips onSelect={onChip} disabled={isLoading} />
          </>
        ) : (
          <>
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
                  onChat={onSend}
                  disabled={isLoading}
                />
              );
            })}
          </>
        )}

        {isLoading ? (
          <div className="flex justify-end">
            <AtrinTyping />
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
