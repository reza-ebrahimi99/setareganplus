import Image from "next/image";
import Link from "next/link";
import { PortalIcon } from "@/components/portal/icons";
import type { PortalHomeHeroModel } from "@/lib/portal/student/home-presentation";

type PortalHomeHeroProps = {
  hero: PortalHomeHeroModel;
  studentName: string;
  gradeLine: string;
  portraitUrl: string | null;
};

export function PortalHomeHero({
  hero,
  studentName,
  gradeLine,
  portraitUrl,
}: PortalHomeHeroProps) {
  return (
    <section
      className="portal-home-hero"
      data-portal-accent={hero.accent}
      data-hero-tone={hero.tone}
    >
      <div className="portal-home-hero__glow" aria-hidden="true" />
      <div className="portal-home-hero__orb portal-home-hero__orb--a" aria-hidden="true" />
      <div className="portal-home-hero__orb portal-home-hero__orb--b" aria-hidden="true" />
      <div className="portal-home-hero__art" aria-hidden="true">
        <PortalIcon name={hero.icon} className="size-16" />
      </div>
      <div className="portal-home-hero__content">
        <div className="portal-home-hero__identity">
          <div className="portal-home-hero__avatar">
            {portraitUrl ? (
              <Image
                src={portraitUrl}
                alt={studentName}
                fill
                unoptimized
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <span aria-hidden="true">{studentName.slice(0, 1)}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="portal-home-hero__greeting">{hero.greeting}</p>
            {gradeLine ? (
              <p className="portal-home-hero__meta">{gradeLine}</p>
            ) : null}
          </div>
        </div>

        <div className="portal-home-hero__copy">
          <span className="portal-home-hero__badge" aria-hidden="true">
            <PortalIcon name={hero.icon} className="size-5" />
          </span>
          <h1 className="portal-home-hero__headline">{hero.headline}</h1>
          <p className="portal-home-hero__support">{hero.support}</p>
          {hero.cta ? (
            <Link href={hero.cta.href} className="portal-home-hero__cta">
              {hero.cta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
