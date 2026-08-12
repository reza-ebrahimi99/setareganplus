"use client";

import { useEffect } from "react";
import { AtrinPanel } from "@/components/atrin/AtrinPanel";
import { useAiChat } from "@/hooks/useAiChat";

type AtrinEmbeddedChatProps = {
  pendingPrompt?: string | null;
  onPendingConsumed?: () => void;
  onUserSend?: (text: string) => void;
  onModeChange?: (modeId: string) => void;
};

/** Embedded chat for /atrin landing — same conversation hook, no backend change. */
export function AtrinEmbeddedChat({
  pendingPrompt,
  onPendingConsumed,
  onUserSend,
  onModeChange,
}: AtrinEmbeddedChatProps) {
  const chat = useAiChat();

  useEffect(() => {
    const text = pendingPrompt?.trim();
    if (!text || chat.isLoading) return;
    onUserSend?.(text);
    void chat.sendMessage(text);
    onPendingConsumed?.();
  }, [pendingPrompt]); // eslint-disable-line react-hooks/exhaustive-deps -- send once per pending

  function handleSend(text: string) {
    onUserSend?.(text);
    void chat.sendMessage(text);
  }

  return (
    <AtrinPanel
      open
      embed
      tall
      onClose={() => undefined}
      messages={chat.messages}
      isLoading={chat.isLoading}
      error={chat.error}
      onSend={handleSend}
      onRetry={chat.retryLast}
      onClear={chat.clearConversation}
      onModeChange={onModeChange}
      appendLocalExchange={chat.appendLocalExchange}
    />
  );
}
