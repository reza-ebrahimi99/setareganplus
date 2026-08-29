import Link from "next/link";
import { PortalIcon, type PortalIconName } from "@/components/portal/icons";
import type { AnalysisCardModel } from "@/lib/guidance/analysis/types";

type AnalysisCardProps = {
  card: AnalysisCardModel;
  emphasized?: boolean;
};

/**
 * Universal Analysis Card — Icon · Title · Status · Description · CTA
 */
export function AnalysisCard({ card, emphasized = false }: AnalysisCardProps) {
  return (
    <article
      className={`guidance-analysis-card${emphasized ? " guidance-analysis-card--emphasized" : ""}`}
      data-status={card.status}
      data-portal-accent={card.accent ?? "gold"}
    >
      <div className="guidance-analysis-card__top">
        <span className="guidance-analysis-card__icon" aria-hidden="true">
          <PortalIcon name={card.icon} className="size-5" />
        </span>
        <span className="guidance-analysis-card__status">{card.statusLabel}</span>
      </div>
      <h3 className="guidance-analysis-card__title">{card.title}</h3>
      <p className="guidance-analysis-card__desc">{card.description}</p>
      {card.meta ? (
        <p className="guidance-analysis-card__meta">{card.meta}</p>
      ) : null}
      {card.cta ? (
        <Link href={card.cta.href} className="guidance-analysis-card__cta">
          {card.cta.label}
        </Link>
      ) : null}
    </article>
  );
}

type AnalysisEmptyStateProps = {
  icon?: PortalIconName;
  title: string;
  description: string;
};

export function AnalysisEmptyState({
  icon = "spark",
  title,
  description,
}: AnalysisEmptyStateProps) {
  return (
    <div className="guidance-analysis-empty" data-portal-accent="gold">
      <span className="guidance-analysis-empty__icon" aria-hidden="true">
        <PortalIcon name={icon} className="size-7" />
      </span>
      <p className="guidance-analysis-empty__title">{title}</p>
      <p className="guidance-analysis-empty__desc">{description}</p>
    </div>
  );
}
