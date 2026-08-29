import Link from "next/link";
import { PortalIcon, type PortalIconName } from "@/components/portal/icons";
import type { PortalAccentId } from "@/components/portal/theme/types";

export type PortalModuleAction = {
  href: string;
  label: string;
};

export type PortalModuleHeroModel = {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: PortalIconName;
  accent: PortalAccentId;
  status?: string;
  primaryCta?: PortalModuleAction;
  secondaryCta?: PortalModuleAction;
};

type PortalModuleHeroProps = {
  hero: PortalModuleHeroModel;
};

/** Shared premium module hero — Assessments / Achievements / Profile / Experience. */
export function PortalModuleHero({ hero }: PortalModuleHeroProps) {
  return (
    <section className="portal-module-hero" data-portal-accent={hero.accent}>
      <div className="portal-module-hero__glow" aria-hidden="true" />
      <div className="portal-module-hero__inner">
        <div className="portal-module-hero__top">
          <span className="portal-module-hero__icon" aria-hidden="true">
            <PortalIcon name={hero.icon} className="size-6" />
          </span>
          {hero.status ? (
            <span className="portal-module-hero__status">{hero.status}</span>
          ) : null}
        </div>
        <p className="portal-module-hero__eyebrow">{hero.eyebrow}</p>
        <h1 className="portal-module-hero__title">{hero.title}</h1>
        <p className="portal-module-hero__subtitle">{hero.subtitle}</p>
        <div className="portal-module-hero__actions">
          {hero.primaryCta ? (
            <Link href={hero.primaryCta.href} className="portal-module-hero__cta">
              {hero.primaryCta.label}
            </Link>
          ) : null}
          {hero.secondaryCta ? (
            <Link
              href={hero.secondaryCta.href}
              className="portal-module-hero__cta portal-module-hero__cta--ghost"
            >
              {hero.secondaryCta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
