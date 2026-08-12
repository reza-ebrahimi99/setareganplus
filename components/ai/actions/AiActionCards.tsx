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
};

/**
 * Premium glass action cards under assistant replies.
 * Renders nothing when there are no actions.
 */
export function AiActionCards({
  cards,
  intent,
  crmScore,
  query,
  response,
  pathname: pathnameProp,
}: AiActionCardsProps) {
  const pathnameHook = usePathname();
  const pathname = pathnameProp ?? pathnameHook;
  const reduce = useReducedMotion();

  const resolved = useMemo(() => {
    if (cards) return [...cards];
    return AiActionResolver({
      intent,
      crmScore,
      pathname,
      query,
      response,
    });
  }, [cards, crmScore, intent, pathname, query, response]);

  if (resolved.length === 0) return null;

  const primary = resolved.filter((card) => card.priority <= 20);
  const secondary = resolved.filter((card) => card.priority > 20);
  const groups = [
    { id: "primary", label: "اقدام اصلی", items: primary },
    { id: "more", label: "میانبرهای بیشتر", items: secondary },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="w-full max-w-[94%] space-y-3" dir="rtl">
      {groups.map((group) => (
        <motion.div
          key={group.id}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-[0.7rem] font-medium tracking-wide text-[#94a3b8]">
            {group.label}
          </p>
          <ul className="grid gap-2">
            {group.items.map((card) => (
              <li key={card.id}>
                <AiActionCard card={card} />
              </li>
            ))}
          </ul>
        </motion.div>
      ))}
    </div>
  );
}
