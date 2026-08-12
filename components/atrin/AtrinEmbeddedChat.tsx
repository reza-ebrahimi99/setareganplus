"use client";

import { AtrinPanel } from "@/components/atrin/AtrinPanel";
import { useAiChat } from "@/hooks/useAiChat";

/** Embedded chat for /atrin landing — same conversation hook, no backend change. */
export function AtrinEmbeddedChat() {
  const chat = useAiChat();

  return (
    <AtrinPanel
      open
      embed
      onClose={() => undefined}
      messages={chat.messages}
      isLoading={chat.isLoading}
      error={chat.error}
      onSend={chat.sendMessage}
      onRetry={chat.retryLast}
      onClear={chat.clearConversation}
    />
  );
}
