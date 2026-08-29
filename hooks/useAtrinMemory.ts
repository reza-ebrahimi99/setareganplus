"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearMemoryStorage,
  extractMemoryFacts,
  loadMemoryOverrides,
  mergeMemoryFacts,
  saveMemoryOverrides,
  type AtrinMemoryFact,
} from "@/lib/atrin/memory";
import type { AiMessage } from "@/types/ai";

export function useAtrinMemory(messages: readonly AiMessage[]) {
  const [overrides, setOverrides] = useState<AtrinMemoryFact[]>([]);
  const [suppressed, setSuppressed] = useState(false);
  const userCount = messages.filter((item) => item.role === "user").length;

  useEffect(() => {
    setOverrides(loadMemoryOverrides());
  }, []);

  useEffect(() => {
    setSuppressed(false);
  }, [userCount]);

  const extracted = useMemo(() => {
    const texts = messages
      .filter((item) => item.role === "user")
      .map((item) => item.content);
    return extractMemoryFacts(texts);
  }, [messages]);

  const facts = useMemo(() => {
    if (suppressed) return [];
    return mergeMemoryFacts(extracted, overrides);
  }, [extracted, overrides, suppressed]);

  function removeFact(id: string) {
    const next = facts.filter((fact) => fact.id !== id);
    setOverrides(next);
    saveMemoryOverrides(next);
  }

  function clearAll() {
    setOverrides([]);
    setSuppressed(true);
    clearMemoryStorage();
  }

  return { facts, removeFact, clearAll };
}
