"use client";

import Link from "next/link";
import { toPersianDigits } from "@/lib/persian";
import type { AiCitation } from "@/types/ai-citations";

type AiCitationsProps = {
  citations?: readonly AiCitation[];
};

export function AiCitations({ citations = [] }: AiCitationsProps) {
  if (citations.length === 0) return null;

  return (
    <div className="w-full max-w-[92%] rounded-xl border border-border bg-background/80 px-3 py-2">
      <p className="text-[0.7rem] font-medium tracking-wide text-secondary">
        منابع
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {citations.map((citation) => {
          const label = toPersianDigits(citation.label);
          if (!citation.href) {
            return (
              <li
                key={citation.id}
                className="rounded-full border border-border bg-white px-2.5 py-1 text-[0.7rem] text-muted"
              >
                {label}
              </li>
            );
          }
          return (
            <li key={citation.id}>
              <Link
                href={citation.href}
                className="inline-flex rounded-full border border-border bg-white px-2.5 py-1 text-[0.7rem] text-primary transition-colors hover:border-secondary/40"
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
