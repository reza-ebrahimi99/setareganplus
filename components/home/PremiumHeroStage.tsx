"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { MediaImage } from "@/components/ui/MediaImage";
import type { MediaAsset } from "@/lib/media";
import { hasMediaUrl } from "@/lib/media";
import { toPersianDigits } from "@/lib/persian";

export type PremiumHeroStageProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  slogan: string;
  logo: MediaAsset;
  ghalamchiLogo: MediaAsset;
  video: MediaAsset;
  background: MediaAsset;
  stats: ReadonlyArray<{ value: string; label: string }>;
  ctas: ReadonlyArray<{ label: string; href: string; variant: "secondary" | "outline" }>;
};

function HeroLogoFallback({ label }: { label: string }) {
  return (
    <span className="px-2 text-center text-xs font-semibold text-white/90">
      {label}
    </span>
  );
}

function EqualBrandMark({
  media,
  fallback,
  priority,
  clear = false,
}: {
  media: MediaAsset;
  fallback: ReactNode;
  priority?: boolean;
  clear?: boolean;
}) {
  return (
    <div
      className={`brand-logo-frame brand-logo-frame--hero brand-logo-frame--on-dark${
        clear ? " brand-logo-frame--clear" : ""
      }`}
    >
      {hasMediaUrl(media) ? (
        <MediaImage
          media={media}
          width={160}
          height={160}
          className="h-full w-full object-contain p-2.5"
          priority={priority}
        />
      ) : (
        fallback
      )}
    </div>
  );
}

export function PremiumHeroStage({
  eyebrow,
  title,
  subtitle,
  description,
  slogan,
  logo,
  ghalamchiLogo,
  video,
  background,
  stats,
  ctas,
}: PremiumHeroStageProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotionRef = useRef(false);

  const hasVideo = hasMediaUrl(video);
  const hasCover = hasMediaUrl(background);
  const posterUrl = hasCover ? background.url : undefined;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => {
      reduceMotionRef.current = mediaQuery.matches;
      if (mediaQuery.matches) {
        section.style.setProperty("--hero-scroll", "0");
        section.style.setProperty("--hero-mx", "0");
        section.style.setProperty("--hero-my", "0");
      }
    };
    syncReducedMotion();

    let frame = 0;
    const updateScroll = () => {
      frame = 0;
      if (reduceMotionRef.current) return;
      const rect = section.getBoundingClientRect();
      const height = section.offsetHeight || 1;
      const progress = Math.min(1, Math.max(0, -rect.top / (height * 0.85)));
      section.style.setProperty("--hero-scroll", progress.toFixed(4));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    mediaQuery.addEventListener("change", syncReducedMotion);
    updateScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      mediaQuery.removeEventListener("change", syncReducedMotion);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (reduceMotionRef.current) return;
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    section.style.setProperty("--hero-mx", x.toFixed(3));
    section.style.setProperty("--hero-my", y.toFixed(3));
  };

  const onPointerLeave = () => {
    const section = sectionRef.current;
    if (!section) return;
    section.style.setProperty("--hero-mx", "0");
    section.style.setProperty("--hero-my", "0");
  };

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-heading"
      className="premium-hero relative isolate overflow-hidden"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div aria-hidden="true" className="premium-hero-media absolute inset-0">
        <div className="premium-hero-gradient absolute inset-0" />

        {hasCover ? (
          <MediaImage
            media={background}
            fill
            priority
            sizes="100vw"
            className="premium-hero-cover object-cover"
          />
        ) : null}

        {hasVideo ? (
          <video
            className="premium-hero-video absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={posterUrl}
            aria-hidden="true"
          >
            <source src={video.url} />
          </video>
        ) : null}

        <div className="premium-hero-veil absolute inset-0" />
        <div className="premium-hero-lights absolute inset-0" />
      </div>

      <Container className="relative z-10 py-16 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="premium-hero-copy max-w-2xl lg:col-span-7">
            <Eyebrow className="border-white/15 bg-white/5 text-secondary shadow-none backdrop-blur-md">
              {eyebrow}
            </Eyebrow>

            <div className="mt-6 flex flex-wrap items-center gap-4 sm:gap-5">
              <EqualBrandMark
                media={logo}
                priority
                clear
                fallback={<HeroLogoFallback label="ستارگان" />}
              />
              <div
                aria-hidden="true"
                className="hidden h-14 w-px bg-white/20 sm:block"
              />
              <EqualBrandMark
                media={ghalamchiLogo}
                fallback={<HeroLogoFallback label="قلم‌چی" />}
              />
            </div>

            <h1
              id="hero-heading"
              className="premium-hero-title mt-8 text-[2.15rem] font-bold tracking-tight text-white sm:text-5xl lg:text-[3.35rem] lg:leading-[1.1]"
            >
              {toPersianDigits(title)}
            </h1>

            <p className="premium-hero-subtitle mt-4 max-w-xl text-base font-medium leading-8 text-white/85 sm:text-xl sm:leading-9">
              {toPersianDigits(subtitle)}
            </p>

            <p className="mt-4 max-w-lg text-sm leading-8 text-white/65 sm:text-base">
              {toPersianDigits(description)}
            </p>

            <p className="mt-3 text-sm font-semibold tracking-wide text-secondary/95">
              {toPersianDigits(slogan)}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              {ctas.map((cta, index) => (
                <Button
                  key={cta.href}
                  href={cta.href}
                  variant={cta.variant}
                  className={
                    index === 0
                      ? "hero-cta hero-cta--primary"
                      : "hero-cta hero-cta--ghost"
                  }
                >
                  {cta.label}
                </Button>
              ))}
            </div>
          </div>

          <aside
            aria-label="آمار کلیدی دبستان ستارگان آینده"
            className="premium-hero-cards relative min-h-[18rem] lg:col-span-5 lg:min-h-[26rem]"
          >
            <ul className="premium-hero-card-grid relative grid grid-cols-2 gap-3 sm:gap-4 lg:absolute lg:inset-0 lg:grid-cols-2 lg:content-center lg:gap-5">
              {stats.map((stat, index) => (
                <li
                  key={stat.label}
                  className={`premium-hero-float-card${
                    index % 2 === 1 ? " premium-hero-float-card--offset" : ""
                  }`}
                  style={
                    {
                      "--card-index": index,
                      "--card-tilt": `${index % 2 === 0 ? -1 : 1}deg`,
                    } as CSSProperties
                  }
                >
                  <div className="glass-stat-card premium-hero-float-inner">
                    <dl>
                      <dt className="order-2 mt-2 text-[0.7rem] font-medium leading-5 text-white/65 sm:text-xs">
                        {stat.label}
                      </dt>
                      <dd className="order-1 text-2xl font-bold tracking-tight text-secondary sm:text-3xl">
                        {toPersianDigits(stat.value)}
                      </dd>
                    </dl>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </Container>
    </section>
  );
}
