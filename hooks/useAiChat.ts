"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AI_WELCOME_MESSAGE } from "@/content/ai-assistant";
import { sendAiChat } from "@/lib/ai/api";
import { AI_ASSISTANT_STORAGE_KEY } from "@/lib/ai/assistant-config";
import {
  clearLocalConversation,
  getOrCreateConversationId,
  getOrCreateSessionId,
} from "@/lib/ai/session";
import type { AiChatError, AiChatStatus, AiMessage } from "@/types/ai";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createWelcomeMessage(): AiMessage {
  return {
    id: "welcome",
    role: "assistant",
    content: AI_WELCOME_MESSAGE,
    createdAt: Date.now(),
    status: "complete",
  };
}

function isAiMessage(value: unknown): value is AiMessage {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    (item.role === "user" ||
      item.role === "assistant" ||
      item.role === "system") &&
    typeof item.content === "string" &&
    typeof item.createdAt === "number"
  );
}

function loadMessages(): AiMessage[] {
  if (typeof window === "undefined") return [createWelcomeMessage()];
  try {
    const raw = window.localStorage.getItem(AI_ASSISTANT_STORAGE_KEY);
    if (!raw) return [createWelcomeMessage()];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createWelcomeMessage()];
    }
    const messages = parsed.filter(isAiMessage);
    return messages.length > 0 ? messages : [createWelcomeMessage()];
  } catch {
    return [createWelcomeMessage()];
  }
}

export function useAiChat() {
  const [messages, setMessages] = useState<AiMessage[]>([createWelcomeMessage()]);
  const [status, setStatus] = useState<AiChatStatus>("idle");
  const [error, setError] = useState<AiChatError | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [conversationId, setConversationId] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const lastUserTextRef = useRef<string | null>(null);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
    setConversationId(getOrCreateConversationId());
    setMessages(loadMessages());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        AI_ASSISTANT_STORAGE_KEY,
        JSON.stringify(messages),
      );
    } catch {
      // ignore quota / private mode
    }
  }, [hydrated, messages]);

  const isLoading = status === "loading" || status === "streaming";

  const sendMessage = useCallback(async (rawText: string) => {
    const text = rawText.trim();
    if (!text || abortRef.current) return;

    const userMessage: AiMessage = {
      id: createId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
      status: "complete",
    };

    lastUserTextRef.current = text;
    setError(null);
    setStatus("loading");
    setMessages((prev) => [...prev, userMessage]);

    const controller = new AbortController();
    abortRef.current = controller;

    const history = [...messages, userMessage]
      .filter((item) => item.role === "user" || item.role === "assistant")
      .map((item) => ({ role: item.role, content: item.content }));

    const result = await sendAiChat({
      messages: history,
      signal: controller.signal,
    });

    abortRef.current = null;

    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }

    const assistantMessage: AiMessage = {
      id: createId(),
      role: "assistant",
      content: result.content,
      createdAt: Date.now(),
      status: "complete",
      actions: result.actions,
      recommendations: result.recommendations,
      citations: result.citations,
      suggestions: result.suggestions,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setStatus("idle");
    setError(null);
  }, [messages]);

  const retryLast = useCallback(async () => {
    const text = lastUserTextRef.current;
    if (!text || isLoading) return;

    setError(null);
    const last = messages[messages.length - 1];
    if (last?.role === "user" && last.content === text) {
      setStatus("loading");
      const controller = new AbortController();
      abortRef.current = controller;
      const history = messages
        .filter((item) => item.role === "user" || item.role === "assistant")
        .map((item) => ({ role: item.role, content: item.content }));
      const result = await sendAiChat({
        messages: history,
        signal: controller.signal,
      });
      abortRef.current = null;
      if (!result.ok) {
        setStatus("error");
        setError(result.error);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          content: result.content,
          createdAt: Date.now(),
          status: "complete",
          actions: result.actions,
          recommendations: result.recommendations,
          citations: result.citations,
          suggestions: result.suggestions,
        },
      ]);
      setStatus("idle");
      return;
    }

    await sendMessage(text);
  }, [isLoading, messages, sendMessage]);

  const clearConversation = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setError(null);
    setStatus("idle");
    const nextConversationId = clearLocalConversation();
    setConversationId(nextConversationId);
    setMessages([createWelcomeMessage()]);
  }, []);

  const suggestionVisible = useMemo(() => {
    const nonWelcome = messages.filter((item) => item.id !== "welcome");
    return nonWelcome.length === 0 && !isLoading && !error;
  }, [error, isLoading, messages]);

  const appendLocalExchange = useCallback(
    (userLabel: string, assistantContent: string) => {
      const userMessage: AiMessage = {
        id: createId(),
        role: "user",
        content: userLabel,
        createdAt: Date.now(),
        status: "complete",
      };
      const assistantMessage: AiMessage = {
        id: createId(),
        role: "assistant",
        content: assistantContent,
        createdAt: Date.now() + 1,
        status: "complete",
      };
      lastUserTextRef.current = userLabel;
      setError(null);
      setStatus("idle");
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
    },
    [],
  );

  const appendAssistantMessage = useCallback((content: string) => {
    const assistantMessage: AiMessage = {
      id: createId(),
      role: "assistant",
      content,
      createdAt: Date.now(),
      status: "complete",
    };
    setMessages((prev) => [...prev, assistantMessage]);
    setStatus("idle");
    setError(null);
  }, []);

  return {
    messages,
    status,
    error,
    isLoading,
    hydrated,
    suggestionVisible,
    sessionId,
    conversationId,
    sendMessage,
    retryLast,
    clearConversation,
    appendLocalExchange,
    appendAssistantMessage,
  };
}
