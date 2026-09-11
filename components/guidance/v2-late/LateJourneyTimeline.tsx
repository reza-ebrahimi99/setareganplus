import { SetareganBrandMark } from "@/components/guidance/brand/SetareganBrandMark";
import type { LateStepStatusView } from "@/lib/guidance/journey-v2/late-status";

export function LateJourneyTimeline(props: {
  items: readonly LateStepStatusView[];
  compact?: boolean;
}) {
  return (
    <section className="gv2-late-timeline" aria-label="مسیر مراحل پایانی">
      <div className="gv2-late-timeline__brand">
        <SetareganBrandMark size={40} compact />
      </div>
      <ol className="gv2-late-timeline__list">
        {props.items.map((item) => (
          <li
            key={item.step}
            className={`gv2-late-timeline__item gv2-late-timeline__item--${item.tone}${
              item.current ? " is-current" : ""
            }`}
          >
            <span className="gv2-late-timeline__label">{item.label}</span>
            <strong className="gv2-late-timeline__status">{item.status}</strong>
            {props.compact ? null : (
              <span className="gv2-late-timeline__owner">{item.owner}</span>
            )}
          </li>
        ))}
      </ol>
      {props.items
        .filter((item) => item.current)
        .map((item) => (
          <p key={`now-${item.step}`} className="gv2-late-timeline__now">
            مسئول اکنون: {item.owner} · {item.nextAction}
            <span>پس از تکمیل: {item.afterCompletion}</span>
          </p>
        ))}
    </section>
  );
}
