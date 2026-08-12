"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AtrinComposer } from "@/components/atrin/AtrinComposer";
import { AtrinConversation } from "@/components/atrin/AtrinConversation";
import { AtrinHeader } from "@/components/atrin/AtrinHeader";
import {
  AtrinCommandPalette,
  AtrinPersonalityBanner,
} from "@/components/atrin/os";
import { ATRIN_BRAND } from "@/content/atrin";
import { useAtrinMemory } from "@/hooks/useAtrinMemory";
import { useAtrinMode } from "@/hooks/useAtrinMode";
import { resolveAtrinPersonality } from "@/lib/atrin/personality";
import type { AiChatError, AiMessage } from "@/types/ai";

type AtrinPanelProps = {
  open: boolean;
  onClose: () => void;
  messages: AiMessage[];
  isLoading: boolean;
  error: AiChatError | null;
  onSend: (text: string) => void;
  onRetry: () => void;
  onClear?: () => void;
  embed?: boolean;
};

export function AtrinPanel({
  open,
  onClose,
  messages,
  isLoading,
  error,
  onSend,
  onRetry,
  onClear,
  embed = false,
}: AtrinPanelProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { modeId } = useAtrinMode(messages);
  const memory = useAtrinMemory(messages);
  const [heroDismissed, setHeroDismissed] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [offline, setOffline] = useState(false);

  const hasUserMessages = messages.some((item) => item.role === "user");
  const showHero = !hasUserMessages && !heroDismissed;

  const personality = useMemo(
    () =>
      resolveAtrinPersonality({
        modeId,
        isLoading,
        hasError: Boolean(error),
        offline,
        showHero,
      }),
    [modeId, isLoading, error, offline, showHero],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setOffline(navigator.onLine === false);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!open || embed) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (commandsOpen) setCommandsOpen(false);
        else onClose();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandsOpen(true);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    const focusTimer = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("[data-atrin-close]")
        ?.focus();
    }, 40);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose, embed, commandsOpen]);

  useEffect(() => {
    if (!open) setHeroDismissed(false);
  }, [open]);

  function handleStart() {
    setHeroDismissed(true);
  }

  function handleSend(text: string) {
    setHeroDismissed(true);
    onSend(text);
  }

  const panelBody = (
    <div
      ref={panelRef}
      role={embed ? "region" : "dialog"}
      aria-modal={embed ? undefined : true}
      aria-labelledby={titleId}
      className="atrin-root atrin-space-bg relative flex h-full w-full flex-col overflow-hidden"
    >
      <span id={titleId} className="sr-only">
        {ATRIN_BRAND.name} — {ATRIN_BRAND.subtitle}
      </span>
      <AtrinHeader
        modeId={modeId}
        onClose={onClose}
        onClear={onClear}
        hideClose={embed}
      />
      <AtrinPersonalityBanner state={personality} />
      <AtrinConversation
        messages={messages}
        modeId={modeId}
        isLoading={isLoading}
        error={error}
        showHero={showHero}
        memoryFacts={memory.facts}
        onRemoveMemory={memory.removeFact}
        onClearMemory={memory.clearAll}
        onSend={handleSend}
        onRetry={onRetry}
        onStartChat={handleStart}
      />
      <AtrinComposer
        onSend={handleSend}
        disabled={isLoading}
        autoFocus={!showHero && open}
        onOpenCommands={() => setCommandsOpen(true)}
      />
      <AtrinCommandPalette
        open={commandsOpen}
        onClose={() => setCommandsOpen(false)}
        onSelect={handleSend}
      />
    </div>
  );

  if (embed) {
    return (
      <div className="h-[min(72vh,640px)] overflow-hidden rounded-[1.5rem] border border-white/10 shadow-[0_24px_80px_rgb(0_0_0_/_0.45)]">
        {panelBody}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80]">
          <motion.button
            type="button"
            aria-label={ATRIN_BRAND.backdropLabel}
            className="absolute inset-0 bg-[#020617]/70 backdrop-blur-sm"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute inset-y-0 start-0 flex w-full max-w-full flex-col sm:w-[440px]"
            initial={reduce ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduce ? undefined : { x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div className="h-full overflow-hidden shadow-[-20px_0_60px_rgb(0_0_0_/_0.5)] sm:rounded-e-3xl">
              {panelBody}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
