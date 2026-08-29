"use client";

import type { CurriculumTopicNode } from "@/lib/atrin/curriculum";

type TopicCardProps = {
  topic: CurriculumTopicNode;
};

export function TopicCard({ topic }: TopicCardProps) {
  return (
    <section
      className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-3 text-right"
      aria-label={`موضوع ${topic.label}`}
    >
      <h4 className="text-sm font-medium text-violet-100">{topic.label}</h4>
      <p className="mt-1 text-[11px] text-white/45">
        پایه {topic.grade ?? "—"} · {topic.subject}
      </p>
      {topic.keywords.length ? (
        <p className="mt-2 text-xs text-white/60">
          {topic.keywords.slice(0, 4).join(" · ")}
        </p>
      ) : null}
    </section>
  );
}
