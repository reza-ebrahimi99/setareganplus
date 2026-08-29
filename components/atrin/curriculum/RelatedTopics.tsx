"use client";

import {
  getCurriculumItemById,
  getRelatedTopics,
  type CurriculumTopicNode,
} from "@/lib/atrin/curriculum";

type PrerequisitesProps = {
  prerequisiteIds: string[];
};

export function Prerequisites({ prerequisiteIds }: PrerequisitesProps) {
  if (!prerequisiteIds.length) return null;
  return (
    <section
      className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-right"
      aria-label="پیش‌نیازها"
    >
      <h4 className="text-sm text-amber-100">پیش‌نیازها</h4>
      <ul className="mt-2 space-y-1 text-xs text-white/70">
        {prerequisiteIds.map((id) => {
          const item = getCurriculumItemById(id);
          return <li key={id}>{item?.lesson ?? id}</li>;
        })}
      </ul>
    </section>
  );
}

type RelatedTopicsProps = {
  topic: CurriculumTopicNode;
};

export function RelatedTopics({ topic }: RelatedTopicsProps) {
  const related = getRelatedTopics(topic.id);
  if (!related.length) return null;
  return (
    <section
      className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-right"
      aria-label="موضوعات مرتبط"
    >
      <h4 className="text-sm text-white">موضوعات مرتبط</h4>
      <ul className="mt-2 flex flex-wrap gap-2">
        {related.map((t) => (
          <li
            key={t.id}
            className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/70"
          >
            {t.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
