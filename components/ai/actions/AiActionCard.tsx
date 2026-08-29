"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ActionCardIconView } from "@/components/ai/actions/ActionCardIcons";
import { executeActionCard } from "@/lib/ai/actions/execute";
import { trackAiEvent } from "@/lib/ai/analytics";
import { toPersianDigits } from "@/lib/persian";
import type { ActionCard } from "@/types/action-card";

type AiActionCardProps = {
  card: ActionCard;
  onChat?: (prompt: string) => void;
  disabled?: boolean;
};

export function AiActionCard({
  card,
  onChat,
  disabled = false,
}: AiActionCardProps) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const toastId = useId();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const run = useCallback(async () => {
    if (disabled || busy) return;
    setBusy(true);
    trackAiEvent("clicked_action", {
      label: card.title,
      href: card.href,
      category: card.type,
      meta: {
        icon: card.icon,
        priority: card.priority,
        prompt: card.prompt ?? null,
      },
    });

    try {
      const result = await executeActionCard({ card, router, onChat });
      if (result.ok && result.feedback === "copied") {
        showToast("کپی شد");
      }
    } finally {
      setBusy(false);
    }
  }, [busy, card, disabled, onChat, router, showToast]);

  const title = toast ?? card.title;
  const isBusy = busy || disabled;

  return (
    <div className="relative">
      <motion.button
        type="button"
        disabled={isBusy}
        aria-busy={busy || undefined}
        aria-describedby={toast ? toastId : undefined}
        onClick={() => {
          void run();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            void run();
          }
        }}
        whileHover={reduce || isBusy ? undefined : { y: -2, scale: 1.01 }}
        whileTap={reduce || isBusy ? undefined : { scale: 0.985 }}
        transition={{ duration: 0.2 }}
        className="atrin-action-card group disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#7c3aed]/25 text-[#c4b5fd] shadow-[0_0_16px_rgb(124_58_237_/_0.35)] ring-1 ring-white/10 transition group-hover:bg-[#22d3ee]/20 group-hover:text-cyan-200 group-active:scale-95">
          <ActionCardIconView name={card.icon} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white">
            {toPersianDigits(title)}
          </span>
          <span className="mt-0.5 block text-xs leading-6 text-slate-400">
            {busy
              ? toPersianDigits("در حال انجام…")
              : toPersianDigits(card.subtitle)}
          </span>
        </span>
      </motion.button>
      {toast ? (
        <p
          id={toastId}
          role="status"
          className="pointer-events-none absolute inset-x-3 -bottom-2 z-10 rounded-lg bg-emerald-500/95 px-2 py-1 text-center text-[0.7rem] font-semibold text-white shadow-lg"
        >
          {toast}
        </p>
      ) : null}
    </div>
  );
}
