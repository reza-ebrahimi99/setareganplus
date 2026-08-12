"use client";

import { useEffect, useId, useRef } from "react";
import { AiComposer } from "@/components/ai/AiComposer";
import { AiContextPrompt } from "@/components/ai/AiContextPrompt";
import { AiConversation } from "@/components/ai/AiConversation";
import { AiHeader } from "@/components/ai/AiHeader";
import { AI_HEADER } from "@/content/ai-assistant";
import type { AiChatError, AiMessage } from "@/types/ai";

type AiDrawerProps = {
  open: boolean;
  onClose: () => void;
  messages: AiMessage[];
  isLoading: boolean;
  error: AiChatError | null;
  showSuggestions: boolean;
  onSend: (text: string) => void;
  onRetry: () => void;
  onClear?: () => void;
};

export function AiDrawer({
  open,
  onClose,
  messages,
  isLoading,
  error,
  showSuggestions,
  onSend,
  onRetry,
  onClear,
}: AiDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    const focusTimer = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("[data-ai-close]")
        ?.focus();
    }, 40);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[80] ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label={AI_HEADER.backdropLabel}
        className={`absolute inset-0 bg-primary/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute inset-y-0 start-0 flex w-full max-w-full flex-col border-e border-border bg-[rgb(248_250_252_/_0.96)] shadow-[-12px_0_40px_rgb(15_23_42_/_0.16)] backdrop-blur-md transition-transform duration-300 ease-out sm:w-[420px] ${
          open ? "translate-x-0" : "translate-x-full"
        } motion-reduce:transition-none`}
      >
        <span id={titleId} className="sr-only">
          {AI_HEADER.title} — {AI_HEADER.subtitle}
        </span>
        <AiHeader onClose={onClose} onClear={onClear} />
        <AiContextPrompt visible={showSuggestions} />
        <AiConversation
          messages={messages}
          isLoading={isLoading}
          error={error}
          showSuggestions={showSuggestions}
          onSuggestion={onSend}
          onRetry={onRetry}
        />
        <AiComposer onSend={onSend} disabled={isLoading} />
      </div>
    </div>
  );
}
