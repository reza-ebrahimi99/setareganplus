"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import { AtrinComposer } from "@/components/atrin/AtrinComposer";
import { AtrinConversation } from "@/components/atrin/AtrinConversation";
import { AtrinHeader } from "@/components/atrin/AtrinHeader";
import { AtrinCommandPalette } from "@/components/atrin/os";
import {
  ATRIN_BRAND,
  type AtrinQuickChipId,
} from "@/content/atrin";
import { useAtrinMemory } from "@/hooks/useAtrinMemory";
import { useAtrinMode } from "@/hooks/useAtrinMode";
import { rememberFavoriteMode, rememberGrade, rememberPrompt } from "@/lib/atrin/profile";
import {
  advanceLeadFromUserReply,
  ATRIN_CHIP_STARTERS,
  loadAtrinLead,
  saveAtrinLead,
  type AtrinLeadState,
} from "@/lib/atrin/progressive-lead";
import type { AiChatError, AiMessage } from "@/types/ai";

const SESSION_STARTED_KEY = "atrin-session-started-v1";

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
  tall?: boolean;
  onModeChange?: (modeId: string) => void;
  appendLocalExchange?: (userLabel: string, assistantContent: string) => void;
};

function readSessionStarted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(SESSION_STARTED_KEY) === "1";
  } catch {
    return false;
  }
}

function markSessionStarted(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_STARTED_KEY, "1");
  } catch {
    // ignore
  }
}

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
  tall = false,
  onModeChange,
  appendLocalExchange,
}: AtrinPanelProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { modeId } = useAtrinMode(messages);
  const memory = useAtrinMemory(messages);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [focusToken, setFocusToken] = useState(0);
  const [lead, setLead] = useState<AtrinLeadState>(() => loadAtrinLead());

  const hasUserMessages = messages.some((item) => item.role === "user");
  const showWelcome = !hasUserMessages && !sessionStarted;

  useEffect(() => {
    setSessionStarted(readSessionStarted());
  }, []);

  useEffect(() => {
    onModeChange?.(modeId);
  }, [modeId, onModeChange]);

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

  function beginSession() {
    markSessionStarted();
    setSessionStarted(true);
  }

  function persistLead(next: AtrinLeadState) {
    setLead(next);
    saveAtrinLead(next);
  }

  function handleChip(chipId: AtrinQuickChipId) {
    beginSession();

    const starter = ATRIN_CHIP_STARTERS[chipId];
    rememberFavoriteMode(starter.modeHint);
    rememberPrompt(starter.userLabel);

    const nextLead: AtrinLeadState = {
      ...lead,
      step: starter.leadStep,
      path: starter.path,
    };
    persistLead(nextLead);

    if (appendLocalExchange) {
      appendLocalExchange(starter.userLabel, starter.assistant);
    } else {
      onSend(starter.userLabel);
    }

    window.setTimeout(() => setFocusToken((token) => token + 1), 120);
  }

  function handleSend(text: string) {
    beginSession();
    rememberPrompt(text);

    const advanced = advanceLeadFromUserReply(text, lead);
    persistLead(advanced.state);

    if (advanced.state.grade) {
      rememberGrade(advanced.state.grade);
    }

    if (advanced.assistantFollowUp && appendLocalExchange) {
      appendLocalExchange(text, advanced.assistantFollowUp);
      return;
    }

    onSend(text);
  }

  function handleClear() {
    onClear?.();
    // Clearing conversation does not restore welcome in this session.
  }

  const panelBody = (
    <div
      ref={panelRef}
      role={embed ? "region" : "dialog"}
      aria-modal={embed ? undefined : true}
      aria-labelledby={titleId}
      className="atrin-root atrin-space-bg relative flex h-full w-full flex-col overflow-hidden"
      style={{
        paddingTop: embed ? undefined : "env(safe-area-inset-top)",
      }}
    >
      <span id={titleId} className="sr-only">
        {ATRIN_BRAND.name} — {ATRIN_BRAND.subtitle}
      </span>
      <AtrinHeader
        modeId={modeId}
        onClose={onClose}
        onClear={onClear ? handleClear : undefined}
        hideClose={embed}
        compact={!showWelcome}
      />
      <AtrinConversation
        messages={messages}
        modeId={modeId}
        isLoading={isLoading}
        error={error}
        showWelcome={showWelcome}
        memoryFacts={memory.facts}
        onRemoveMemory={memory.removeFact}
        onClearMemory={memory.clearAll}
        onSend={handleSend}
        onRetry={onRetry}
        onChip={handleChip}
      />
      <AtrinComposer
        onSend={handleSend}
        disabled={isLoading}
        autoFocus={!showWelcome && open}
        focusToken={focusToken}
        placeholder="هرچی دوست داری بپرس..."
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
      <div
        className={`overflow-hidden rounded-[1.5rem] border border-white/10 shadow-[0_24px_80px_rgb(0_0_0_/_0.45)] ${
          tall ? "h-[min(78vh,720px)]" : "h-[min(72vh,640px)]"
        }`}
      >
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
            className="absolute inset-y-0 start-0 flex w-full max-w-full flex-col sm:w-[420px]"
            initial={reduce ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduce ? undefined : { x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
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
