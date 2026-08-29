import Link from "next/link";
import { PortalIcon } from "@/components/portal/icons";
import type { PortalJourneyHero } from "@/components/portal/journey/types";

type PortalJourneyHeroProps = {
  hero: PortalJourneyHero;
};

export function PortalJourneyHeroBanner({ hero }: PortalJourneyHeroProps) {
  return (
    <section
      className="portal-journey-hero"
      data-portal-accent={hero.accent}
    >
      <div className="portal-journey-hero__glow" aria-hidden="true" />
      <div className="portal-journey-hero__inner">
        <span className="portal-journey-hero__icon" aria-hidden="true">
          <PortalIcon name={hero.icon} className="size-6" />
        </span>
        <p className="portal-journey-hero__eyebrow">{hero.eyebrow}</p>
        <h1 className="portal-journey-hero__headline">{hero.headline}</h1>
        <p className="portal-journey-hero__support">{hero.support}</p>
        {hero.cta ? (
          <Link href={hero.cta.href} className="portal-journey-hero__cta">
            {hero.cta.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
