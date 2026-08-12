"use client";

import { useState } from "react";
import { AiDrawer } from "@/components/ai/AiDrawer";
import { AiFloatingButton } from "@/components/ai/AiFloatingButton";
import { useAiChat } from "@/hooks/useAiChat";
import { trackAiEvent } from "@/lib/ai/analytics";

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const chat = useAiChat();

  function handleOpen() {
    setOpen(true);
    trackAiEvent("conversation_started", {
      pathname:
        typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }

  return (
    <>
      <AiFloatingButton open={open} onOpen={handleOpen} />
      <AiDrawer
        open={open}
        onClose={() => setOpen(false)}
        messages={chat.messages}
        isLoading={chat.isLoading}
        error={chat.error}
        showSuggestions={chat.suggestionVisible}
        onSend={chat.sendMessage}
        onRetry={chat.retryLast}
        onClear={chat.clearConversation}
      />
    </>
  );
}
