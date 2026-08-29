"use client";

import Link from "next/link";
import { toPersianDigits } from "@/lib/persian";
import type { AiCitation } from "@/types/ai-citations";

type AiCitationsProps = {
  citations?: readonly AiCitation[];
};

/** Sources block — render only when citations exist (caller must gate empties). */
export function AiCitations({ citations = [] }: AiCitationsProps) {
  if (citations.length === 0) return null;

  return (
    <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[0.7rem] font-medium tracking-wide text-slate-400">
        منابع
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {citations.slice(0, 4).map((citation) => {
          const label = toPersianDigits(citation.label);
          if (!citation.href) {
            return (
              <li
                key={citation.id}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] text-slate-400"
              >
                {label}
              </li>
            );
          }
          return (
            <li key={citation.id}>
              <Link
                href={citation.href}
                className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] text-cyan-200 transition-colors hover:border-cyan-400/40"
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
