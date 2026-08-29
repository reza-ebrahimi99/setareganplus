import Link from "next/link";
import { PortalIcon, type PortalIconName } from "@/components/portal/icons";

export type GuidancePlatformPlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon?: PortalIconName;
  accent?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

/**
 * Architecture-only placeholder screen for future Guidance Platform modules.
 * No data fetching. No fake metrics.
 */
export function GuidancePlatformPlaceholder({
  eyebrow,
  title,
  description,
  icon = "spark",
  accent = "purple",
  primaryHref = "/portal/student/services/guidance",
  primaryLabel = "بازگشت به داشبورد",
  secondaryHref,
  secondaryLabel,
}: GuidancePlatformPlaceholderProps) {
  return (
    <section
      className="gp-placeholder"
      data-portal-accent={accent}
      aria-labelledby="gp-placeholder-title"
    >
      <div className="gp-placeholder__orb" aria-hidden="true" />
      <div className="gp-placeholder__icon" aria-hidden="true">
        <PortalIcon name={icon} className="size-8" />
      </div>
      <p className="gp-placeholder__eyebrow">{eyebrow}</p>
      <h1 id="gp-placeholder-title" className="gp-placeholder__title">
        {title}
      </h1>
      <p className="gp-placeholder__desc">{description}</p>
      <div className="gp-placeholder__actions">
        <Link href={primaryHref} className="gp-placeholder__cta">
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link
            href={secondaryHref}
            className="gp-placeholder__cta gp-placeholder__cta--ghost"
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
