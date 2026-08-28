"use client";

import Link from "next/link";
import { trackAiEvent } from "@/lib/ai/analytics";
import { toPersianDigits } from "@/lib/persian";
import type { AiAction } from "@/types/ai-actions";

type AiActionButtonProps = {
  action: AiAction;
  variant?: "action" | "recommendation";
};

function isExternal(href: string): boolean {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("tel:") ||
    href.startsWith("mailto:")
  );
}

export function AiActionButton({
  action,
  variant = "action",
}: AiActionButtonProps) {
  const className =
    "premium-card group flex w-full flex-col gap-1 px-3.5 py-3 text-start transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

  function handleClick() {
    trackAiEvent(
      variant === "recommendation" ? "clicked_recommendation" : "clicked_action",
      {
        label: action.label,
        href: action.href,
        category: action.category ?? action.type,
      },
    );
  }

  const body = (
    <>
      <span className="text-sm font-semibold text-primary">
        {toPersianDigits(action.label)}
      </span>
      {action.description ? (
        <span className="text-xs leading-6 text-muted">
          {toPersianDigits(action.description)}
        </span>
      ) : null}
    </>
  );

  if (isExternal(action.href)) {
    return (
      <a
        href={action.href}
        className={className}
        onClick={handleClick}
        rel={action.href.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {body}
      </a>
    );
  }

  return (
    <Link href={action.href} className={className} onClick={handleClick}>
      {body}
    </Link>
  );
}
