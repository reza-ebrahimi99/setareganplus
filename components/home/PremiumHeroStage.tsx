"use client";

import {
  useEffect,
  useRef,
  useState,
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
  brand: string;
  title: string;
  subtitle: string;
  scrollHint: string;
  logo: MediaAsset;
  ghalamchiLogo: MediaAsset;
  video: MediaAsset;
  background: MediaAsset;
  stats: ReadonlyArray<{ value: string; label: string; id?: string }>;
  ctas: ReadonlyArray<{
    label: string;
    href: string;
    variant: "secondary" | "outline";
  }>;
};

function HeroLogoFallback({ label }: { label: string }) {
  return (
    <span className="px-2 text-center text-xs font-semibold text-white/90">
      {label}
    </span>
  );
}

function BrandMark({
  media,
  fallback,
  priority,
  clear = false,
  dominant = false,
}: {
  media: MediaAsset;
  fallback: ReactNode;
  priority?: boolean;
  clear?: boolean;
  dominant?: boolean;
}) {
  return (
    <div
      className={`brand-logo-frame brand-logo-frame--on-dark brand-logo-float${
        dominant
          ? " brand-logo-frame--hero-dominant"
          : " brand-logo-frame--hero-secondary"
      }${clear ? " brand-logo-frame--clear" : ""}`}
    >
      {hasMediaUrl(media) ? (
        <MediaImage
          media={media}
          width={dominant ? 220 : 96}
          height={dominant ? 220 : 96}
          className="h-full w-full object-contain p-2"
          priority={priority}
        />
      ) : (
        fallback
      )}
    </div>
  );
}

function parseAsciiInt(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function AnimatedStatValue({ value }: { value: string }) {
  const target = parseAsciiInt(value);
  const [display, setDisplay] = useState(() => toPersianDigits(value));

  useEffect(() => {
    if (target === null) {
      setDisplay(toPersianDigits(value));
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setDisplay(toPersianDigits(target));
      return;
    }

    let frame = 0;
    const duration = 1200;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(toPersianDigits(Math.round(target * eased)));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target, value]);

  return <span>{display}</span>;
}

function HeroParticles() {
  const dots = Array.from({ length: 16 }, (_, i) => i);
  return (
    <div aria-hidden="true" className="premium-hero-particles absolute inset-0">
      {dots.map((i) => (
        <span
          key={i}
          className="premium-hero-particle"
          style={{ "--p": i } as CSSProperties}
        />
      ))}
    </div>
  );
}

export function PremiumHeroStage({
  eyebrow,
  brand,
  title,
  subtitle,
  scrollHint,
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
        <div className="premium-hero-beams absolute inset-0" />
        <HeroParticles />
      </div>

      <Container className="premium-hero-shell relative z-10">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="premium-hero-copy max-w-2xl lg:col-span-7">
            <Eyebrow className="border-white/15 bg-white/5 text-secondary shadow-none backdrop-blur-md">
              {eyebrow}
            </Eyebrow>

            {/* Brand-first: Setaregan logo dominates; Ghalamchi is secondary */}
            <div className="mt-7 flex flex-wrap items-end gap-4 sm:gap-5">
              <div className="flex flex-col items-start gap-2">
                <BrandMark
                  media={logo}
                  priority
                  clear
                  dominant
                  fallback={<HeroLogoFallback label="ستارگان" />}
                />
                <p className="text-sm font-semibold tracking-wide text-white/90 sm:text-base">
                  {toPersianDigits(brand)}
                </p>
              </div>
              <div
                aria-hidden="true"
                className="mb-8 hidden h-12 w-px bg-white/15 sm:block"
              />
              <div className="mb-1 flex flex-col items-start gap-1.5 opacity-80">
                <BrandMark
                  media={ghalamchiLogo}
                  fallback={<HeroLogoFallback label="قلم‌چی" />}
                />
                <p className="max-w-[7rem] text-[0.65rem] font-medium leading-4 text-white/55">
                  نمایندگی رسمی قلم‌چی
                </p>
              </div>
            </div>

            <h1
              id="hero-heading"
              className="premium-hero-title mt-8 text-[2.1rem] font-bold tracking-tight text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.12]"
            >
              {toPersianDigits(title)}
            </h1>

            <p className="mt-5 max-w-xl text-base font-medium leading-8 text-white/88 sm:text-xl sm:leading-9">
              {toPersianDigits(subtitle)}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              {ctas.map((cta, index) => (
                <Button
                  key={`${cta.href}-${cta.label}`}
                  href={cta.href}
                  variant={cta.variant}
                  className={
                    index === 0
                      ? "hero-cta hero-cta--primary min-h-12 rounded-2xl px-6"
                      : "hero-cta hero-cta--ghost min-h-12 rounded-2xl px-5 backdrop-blur-md"
                  }
                >
                  {cta.label}
                </Button>
              ))}
            </div>
          </div>

          <aside
            aria-label="آمار کلیدی مجموعه"
            className="premium-hero-cards relative min-h-[14rem] lg:col-span-5 lg:min-h-[24rem]"
          >
            <ul className="premium-hero-card-grid relative grid grid-cols-2 gap-3 sm:gap-4 lg:absolute lg:inset-0 lg:grid-cols-2 lg:content-center lg:gap-5">
              {stats.map((stat, index) => (
                <li
                  key={stat.id ?? stat.label}
                  className={`premium-hero-float-card${
                    index % 2 === 1 ? " premium-hero-float-card--offset" : ""
                  }`}
                  style={
                    {
                      "--card-index": index,
                      "--card-tilt": `${index % 2 === 0 ? -1.1 : 1.1}deg`,
                    } as CSSProperties
                  }
                >
                  <div className="glass-stat-card premium-hero-float-inner">
                    <dl>
                      <dt className="order-2 mt-2 text-[0.7rem] font-medium leading-5 text-white/65 sm:text-xs">
                        {stat.label}
                      </dt>
                      <dd className="order-1 text-2xl font-bold tracking-tight text-secondary sm:text-3xl">
                        <AnimatedStatValue value={stat.value} />
                      </dd>
                    </dl>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </Container>

      <a href="#discover" className="premium-hero-scroll">
        <span className="premium-hero-scroll-icon" aria-hidden="true">
          ↓
        </span>
        <span>{toPersianDigits(scrollHint)}</span>
      </a>
    </section>
  );
}
