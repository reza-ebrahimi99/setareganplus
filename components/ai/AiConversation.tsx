"use client";

import { useEffect, useRef } from "react";
import { AiError } from "@/components/ai/AiError";
import { AiMessage } from "@/components/ai/AiMessage";
import { AiSuggestions } from "@/components/ai/AiSuggestions";
import { AiTyping } from "@/components/ai/AiTyping";
import type { AiChatError, AiMessage as AiMessageType } from "@/types/ai";

type AiConversationProps = {
  messages: AiMessageType[];
  isLoading: boolean;
  error: AiChatError | null;
  showSuggestions: boolean;
  onSuggestion: (text: string) => void;
  onRetry: () => void;
};

export function AiConversation({
  messages,
  isLoading,
  error,
  showSuggestions,
  onSuggestion,
  onRetry,
}: AiConversationProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading, error]);

  const lastAssistantIndex = [...messages]
    .map((item, index) => ({ item, index }))
    .reverse()
    .find((entry) => entry.item.role === "assistant" && entry.item.id !== "welcome")
    ?.index;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="space-y-4">
        {messages.map((message, index) => {
          const previous = index > 0 ? messages[index - 1] : null;
          const userQuery =
            message.role === "assistant" && previous?.role === "user"
              ? previous.content
              : null;

          return (
            <AiMessage
              key={message.id}
              message={message}
              userQuery={userQuery}
              showRetry={Boolean(error) && index === lastAssistantIndex}
              onRetry={onRetry}
            />
          );
        })}

        {isLoading ? <AiTyping /> : null}

        {error ? (
          <AiError
            message={error.message}
            onRetry={onRetry}
            disabled={isLoading}
          />
        ) : null}

        {showSuggestions ? (
          <AiSuggestions onSelect={onSuggestion} disabled={isLoading} />
        ) : null}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
