"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
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
      className={`brand-logo-frame brand-logo-frame--on-dark${
        dominant
          ? " brand-logo-frame--hero-dominant"
          : " brand-logo-frame--hero-secondary"
      }${clear ? " brand-logo-frame--clear" : ""}`}
    >
      {hasMediaUrl(media) ? (
        <MediaImage
          media={media}
          width={dominant ? 240 : 88}
          height={dominant ? 240 : 88}
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
    const duration = 1100;
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

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-heading"
      className="flagship-hero premium-hero relative isolate overflow-hidden"
    >
      <div aria-hidden="true" className="premium-hero-media absolute inset-0">
        <div className="flagship-hero-gradient absolute inset-0" />

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
            <source src={video.url!} />
          </video>
        ) : null}

        <div className="flagship-hero-veil absolute inset-0" />
        <div className="flagship-hero-glow absolute inset-0" />
        <div className="flagship-hero-particles absolute inset-0">
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className="flagship-hero-particle"
              style={{ "--p": i } as CSSProperties}
            />
          ))}
        </div>
      </div>

      <Container className="flagship-hero-shell relative z-10">
        <div className="grid items-end gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="flagship-hero-copy max-w-3xl lg:col-span-7">
            <p className="text-xs font-medium tracking-[0.18em] text-secondary">
              {toPersianDigits(eyebrow)}
            </p>

            <div className="mt-8 flex flex-wrap items-end gap-5 sm:gap-6">
              <div className="relative flex flex-col items-start gap-2">
                <div className="hero-logo-aura" aria-hidden="true" />
                <div className="relative z-[1]">
                  <BrandMark
                    media={logo}
                    priority
                    clear
                    dominant
                    fallback={<HeroLogoFallback label="ستارگان" />}
                  />
                </div>
                <p className="relative text-base font-semibold tracking-wide text-white sm:text-lg">
                  {toPersianDigits(brand)}
                </p>
              </div>
              <div
                aria-hidden="true"
                className="mb-10 hidden h-14 w-px bg-white/15 sm:block"
              />
              <div className="mb-2 flex flex-col items-start gap-1.5 opacity-75">
                <BrandMark
                  media={ghalamchiLogo}
                  fallback={<HeroLogoFallback label="قلم‌چی" />}
                />
                <p className="max-w-[8rem] text-[0.65rem] font-medium leading-4 text-white/55">
                  نمایندگی رسمی قلم‌چی
                </p>
              </div>
            </div>

            <h1
              id="hero-heading"
              className="flagship-hero-title mt-12 text-[2.45rem] font-bold tracking-tight text-white sm:text-5xl lg:text-[3.65rem] lg:leading-[1.08]"
            >
              {toPersianDigits(title)}
            </h1>

            <p className="mt-7 max-w-xl text-base font-medium leading-9 text-white/90 sm:text-xl sm:leading-10">
              {toPersianDigits(subtitle)}
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              {ctas.map((cta, index) => (
                <Button
                  key={`${cta.href}-${cta.label}`}
                  href={cta.href}
                  variant={cta.variant}
                  className={
                    index === 0
                      ? "hero-cta hero-cta--primary hero-cta--dominant min-h-[3.25rem] rounded-2xl px-8 text-base"
                      : "hero-cta hero-cta--ghost min-h-11 rounded-2xl px-5 text-sm backdrop-blur-md opacity-95"
                  }
                >
                  {cta.label}
                </Button>
              ))}
            </div>
          </div>

          <aside
            aria-label="شاخص‌های کلیدی"
            className="flagship-hero-stats lg:col-span-5"
          >
            <ul className="grid grid-cols-2 gap-3 sm:gap-4">
              {stats.map((stat, index) => (
                <li
                  key={stat.id ?? stat.label}
                  className="flagship-stat-card"
                  style={{ "--card-index": index } as CSSProperties}
                >
                  <dl>
                    <dt className="order-2 mt-2 text-[0.7rem] font-medium leading-5 text-white/60 sm:text-xs">
                      {stat.label}
                    </dt>
                    <dd className="order-1 text-2xl font-bold tracking-tight text-secondary sm:text-3xl">
                      <AnimatedStatValue value={stat.value} />
                    </dd>
                  </dl>
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
