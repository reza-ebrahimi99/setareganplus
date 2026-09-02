import { majorExamGroupAccent, MAJOR_EXAM_FILTER_LABELS } from "@/lib/guidance/discover/major-catalog-ui";
import type { DiscoverMajor } from "@/lib/guidance/discover/types";

export function MajorEncyclopediaHero({ item }: { item: DiscoverMajor }) {
  const accent = majorExamGroupAccent(item.examGroup);

  return (
    <header className="major-encyclopedia-hero">
      <div
        className="major-encyclopedia-hero__visual"
        style={{ background: accent.gradient }}
        aria-hidden="true"
      >
        <span className="major-encyclopedia-hero__glyph">{item.title.charAt(0)}</span>
      </div>
      <div className="major-encyclopedia-hero__body">
        <p className="major-encyclopedia-hero__meta">
          <span
            className="major-encyclopedia-hero__badge"
            style={{ backgroundColor: accent.badge }}
          >
            {MAJOR_EXAM_FILTER_LABELS[item.examGroup]}
          </span>
          <span>{item.kicker}</span>
        </p>
        <h1>{item.title}</h1>
        <p className="major-encyclopedia-hero__lead">{item.lead}</p>
      </div>
    </header>
  );
}
