"use client";

import { useState } from "react";
import { AtrinLauncher } from "@/components/atrin/AtrinLauncher";
import { AtrinPanel } from "@/components/atrin/AtrinPanel";
import { useAiChat } from "@/hooks/useAiChat";
import { trackAiEvent } from "@/lib/ai/analytics";

/**
 * Premium آترین assistant shell — reuses useAiChat, no backend changes.
 */
export function AtrinAssistant() {
  const [open, setOpen] = useState(false);
  const chat = useAiChat();

  function handleOpen() {
    setOpen(true);
    trackAiEvent("conversation_started", {
      pathname:
        typeof window !== "undefined" ? window.location.pathname : undefined,
      label: "atrin",
    });
  }

  return (
    <>
      <AtrinLauncher open={open} onOpen={handleOpen} />
      <AtrinPanel
        open={open}
        onClose={() => setOpen(false)}
        messages={chat.messages}
        isLoading={chat.isLoading}
        error={chat.error}
        onSend={chat.sendMessage}
        onRetry={chat.retryLast}
        onClear={chat.clearConversation}
      />
    </>
  );
}
