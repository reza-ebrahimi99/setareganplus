"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ActionCardIconView } from "@/components/ai/actions/ActionCardIcons";
import { trackAiEvent } from "@/lib/ai/analytics";
import { toPersianDigits } from "@/lib/persian";
import type { ActionCard } from "@/types/action-card";

type AiActionCardProps = {
  card: ActionCard;
};

export function AiActionCard({ card }: AiActionCardProps) {
  const [copied, setCopied] = useState(false);
  const reduce = useReducedMotion();

  const track = useCallback(() => {
    trackAiEvent("clicked_action", {
      label: card.title,
      href: card.href,
      category: card.type,
      meta: { icon: card.icon, priority: card.priority },
    });
  }, [card]);

  const body = (
    <>
      <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#7c3aed]/25 text-[#c4b5fd] shadow-[0_0_16px_rgb(124_58_237_/_0.35)] ring-1 ring-white/10 transition group-hover:bg-[#22d3ee]/20 group-hover:text-cyan-200">
        <ActionCardIconView name={card.icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">
          {toPersianDigits(copied ? "کپی شد" : card.title)}
        </span>
        <span className="mt-0.5 block text-xs leading-6 text-slate-400">
          {toPersianDigits(card.subtitle)}
        </span>
      </span>
    </>
  );

  const motionProps = {
    whileHover: reduce ? undefined : { y: -2, scale: 1.01 },
    whileTap: reduce ? undefined : { scale: 0.99 },
    transition: { duration: 0.2 },
    className: "atrin-action-card group",
  };

  if (card.type === "copy") {
    return (
      <motion.button
        type="button"
        {...motionProps}
        onClick={async () => {
          track();
          const text = card.copyText ?? card.href;
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          } catch {
            // ignore
          }
        }}
      >
        {body}
      </motion.button>
    );
  }

  if (
    card.type === "external" ||
    card.type === "call" ||
    card.href.startsWith("http") ||
    card.href.startsWith("tel:") ||
    card.href.startsWith("mailto:")
  ) {
    return (
      <motion.a
        href={card.href}
        {...motionProps}
        onClick={track}
        rel={card.href.startsWith("http") ? "noopener noreferrer" : undefined}
        target={card.href.startsWith("http") ? "_blank" : undefined}
      >
        {body}
      </motion.a>
    );
  }

  return (
    <motion.div {...motionProps}>
      <Link href={card.href} className="flex w-full items-start gap-3" onClick={track}>
        {body}
      </Link>
    </motion.div>
  );
}
