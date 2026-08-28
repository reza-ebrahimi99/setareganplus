"use client";

import { AtrinCard } from "@/components/atrin/ui";
import type { AtrinMemoryFact } from "@/lib/atrin/memory";

type AtrinMemoryPanelProps = {
  facts: AtrinMemoryFact[];
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function AtrinMemoryPanel({
  facts,
  onRemove,
  onClear,
}: AtrinMemoryPanelProps) {
  if (facts.length === 0) return null;

  return (
    <div className="space-y-1" aria-label="حافظه آترین">
      <AtrinCard className="!p-3" hover={false}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-white">به یاد می‌آورم</p>
          <button
            type="button"
            onClick={onClear}
            className="text-[0.7rem] text-slate-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22d3ee]"
          >
            پاک کردن
          </button>
        </div>
        <ul className="mt-2 space-y-1.5">
          {facts.map((fact) => (
            <li
              key={fact.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-2.5 py-1.5 text-xs text-slate-200"
            >
              <span>
                <span className="text-slate-500">{fact.label}: </span>
                {fact.value}
              </span>
              <button
                type="button"
                aria-label={`حذف ${fact.label}`}
                onClick={() => onRemove(fact.id)}
                className="text-slate-500 hover:text-rose-300"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[0.65rem] text-slate-500">
          فقط روی این دستگاه ذخیره می‌شود.
        </p>
      </AtrinCard>
    </div>
  );
}
