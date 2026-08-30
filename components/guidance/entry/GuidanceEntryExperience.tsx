import Image from "next/image";
import Link from "next/link";
import { GuidanceEntryAuth } from "@/components/guidance/entry/GuidanceEntryAuth";
import { GuidanceEntryHeroArt } from "@/components/guidance/entry/GuidanceEntryHeroArt";
import { PortalTheme } from "@/components/portal/theme/PortalTheme";
import { guidanceEntryContent } from "@/content/guidance";
import { toPersianDigits } from "@/lib/persian";

export function GuidanceEntryExperience({
  studentSignedIn,
  counselorSignedIn,
}: {
  studentSignedIn: boolean;
  counselorSignedIn: boolean;
}) {
  const copy = guidanceEntryContent;

  return (
    <PortalTheme className="guidance-entry-root">
      <main className="guidance-entry" dir="rtl" data-portal-accent="purple">
        <header className="guidance-entry__brand">
          <Link href="/" className="guidance-entry__brand-link">
            <Image
              src="/images/brand/logo.png"
              alt="ستارگان پلاس"
              width={132}
              height={44}
              className="guidance-entry__logo"
              priority
            />
            <Image
              src="/images/brand/ghalamchi.jpg"
              alt="قلم‌چی"
              width={44}
              height={44}
              className="guidance-entry__partner"
            />
          </Link>
        </header>

        <div className="guidance-entry__grid">
          <section className="guidance-entry__hero">
            <p className="guidance-entry__kicker">Major Selection OS</p>
            <h1>{copy.title}</h1>
            <p className="guidance-entry__subtitle">{copy.subtitle}</p>
            <p className="guidance-entry__lead">{copy.description}</p>
            <GuidanceEntryHeroArt />
          </section>

          <aside className="guidance-entry__aside">
            <article className="guidance-entry__profile">
              <div className="guidance-entry__portrait">
                <Image
                  src={copy.profile.photo.url}
                  alt={copy.profile.photo.alt}
                  width={112}
                  height={112}
                  className="guidance-entry__photo"
                  priority
                />
                <span className="guidance-entry__portrait-ring" aria-hidden="true" />
              </div>
              <h2>{copy.profile.name}</h2>
              <p className="guidance-entry__role">{copy.profile.role}</p>
              <ul className="guidance-entry__resume">
                {copy.profile.resume.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <dl className="guidance-entry__stats">
                {copy.profile.stats.map((stat) => (
                  <div key={stat.label}>
                    <dt>{stat.label}</dt>
                    <dd>{toPersianDigits(stat.value)}</dd>
                  </div>
                ))}
              </dl>
              <p className="guidance-entry__identity">{copy.profile.identity}</p>
              <ul className="guidance-entry__trust">
                {copy.profile.trusts.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <GuidanceEntryAuth
              studentSignedIn={studentSignedIn}
              counselorSignedIn={counselorSignedIn}
            />
          </aside>
        </div>
      </main>
    </PortalTheme>
  );
}
