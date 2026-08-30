type PortalEmptyStateProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

/**
 * Premium empty state — motivational, never "No Data".
 * Presentational only.
 */
export function PortalEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: PortalEmptyStateProps) {
  return (
    <div className="portal-empty">
      <div className="portal-empty__orb" aria-hidden="true" />
      <div className="portal-empty__icon" aria-hidden="true">
        <span>✦</span>
      </div>
      <h2 className="portal-empty__title">{title}</h2>
      <p className="portal-empty__desc">{description}</p>
      {actionHref && actionLabel ? (
        <a href={actionHref} className="portal-empty__cta">
          {actionLabel}
        </a>
      ) : null}
    </div>
  );
}
