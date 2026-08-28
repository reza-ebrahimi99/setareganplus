"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { AiActionCard } from "@/components/ai/actions/AiActionCard";
import { AiActionResolver } from "@/lib/ai/actions";
import type { ActionCard } from "@/types/action-card";

type AiActionCardsProps = {
  cards?: readonly ActionCard[];
  intent?: string | null;
  crmScore?: "High" | "Medium" | "Low" | null;
  query?: string | null;
  response?: string | null;
  pathname?: string | null;
  onChat?: (prompt: string) => void;
  disabled?: boolean;
};

/**
 * Premium glass action cards under assistant replies.
 * Max 2. Greeting/general → 0. Renders nothing when empty.
 */
export function AiActionCards({
  cards,
  intent,
  crmScore,
  query,
  response,
  pathname: pathnameProp,
  onChat,
  disabled = false,
}: AiActionCardsProps) {
  const pathnameHook = usePathname();
  const pathname = pathnameProp ?? pathnameHook;
  const reduce = useReducedMotion();

  const resolved = useMemo(() => {
    if (cards) {
      return cards
        .filter((card) => {
          if (card.type === "chat") return Boolean(card.prompt?.trim());
          return Boolean(card.href?.trim());
        })
        .slice(0, 2);
    }
    return AiActionResolver({
      intent,
      crmScore,
      pathname,
      query,
      response,
    }).slice(0, 2);
  }, [cards, crmScore, intent, pathname, query, response]);

  if (resolved.length === 0) return null;

  return (
    <motion.ul
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid w-full gap-2"
      aria-label="اقدام‌ها"
    >
      {resolved.map((card) => (
        <li key={card.id}>
          <AiActionCard card={card} onChat={onChat} disabled={disabled} />
        </li>
      ))}
    </motion.ul>
  );
}
