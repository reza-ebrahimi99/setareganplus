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

export type HeroScene = {
  id: string;
  headline: string;
  support: string;
};

export type HeroTickerItem = {
  id: string;
  emoji: string;
  text: string;
};

export type PremiumHeroStageProps = {
  eyebrow: string;
  title: string;
  description: string;
  slogan: string;
  scrollHint: string;
  logo: MediaAsset;
  ghalamchiLogo: MediaAsset;
  video: MediaAsset;
  background: MediaAsset;
  scenes: ReadonlyArray<HeroScene>;
  sceneIntervalMs: number;
  tickerItems: ReadonlyArray<HeroTickerItem>;
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
      className={`brand-logo-frame brand-logo-frame--hero brand-logo-frame--on-dark brand-logo-float${
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

function parseAsciiInt(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function AnimatedStatValue({ value }: { value: string }) {
  const target = parseAsciiInt(value);
  const [display, setDisplay] = useState(() =>
    target === null ? toPersianDigits(value) : toPersianDigits(0),
  );
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    if (target === null) {
      setDisplay(toPersianDigits(value));
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceMotionRef.current = mediaQuery.matches;
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
  const dots = Array.from({ length: 18 }, (_, i) => i);
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

function LiveSuccessTicker({ items }: { items: ReadonlyArray<HeroTickerItem> }) {
  if (items.length === 0) return null;
  const loop = [...items, ...items];

  return (
    <div className="premium-hero-ticker" role="region" aria-label="اعلانات موفقیت">
      <div className="premium-hero-ticker-fade" aria-hidden="true" />
      <div className="premium-hero-ticker-track">
        {loop.map((item, index) => (
          <span
            key={`${item.id}-${index}`}
            className="premium-hero-ticker-item"
            aria-hidden={index >= items.length ? true : undefined}
          >
            <span className="premium-hero-ticker-emoji" aria-hidden="true">
              {item.emoji}
            </span>
            <span>{toPersianDigits(item.text)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function PremiumHeroStage({
  eyebrow,
  title,
  description,
  slogan,
  scrollHint,
  logo,
  ghalamchiLogo,
  video,
  background,
  scenes,
  sceneIntervalMs,
  tickerItems,
  stats,
  ctas,
}: PremiumHeroStageProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotionRef = useRef(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [scenePhase, setScenePhase] = useState<"in" | "out">("in");

  const hasVideo = hasMediaUrl(video);
  const hasCover = hasMediaUrl(background);
  const posterUrl = hasCover ? background.url : undefined;
  const activeScene = scenes[sceneIndex] ?? scenes[0];
  const sceneCount = scenes.length;

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

  useEffect(() => {
    if (sceneCount < 2) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    let outTimer = 0;
    const interval = window.setInterval(() => {
      setScenePhase("out");
      outTimer = window.setTimeout(() => {
        setSceneIndex((current) => (current + 1) % sceneCount);
        setScenePhase("in");
      }, 420);
    }, sceneIntervalMs);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(outTimer);
    };
  }, [sceneCount, sceneIntervalMs]);

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

      <LiveSuccessTicker items={tickerItems} />

      <Container className="premium-hero-shell relative z-10">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-10">
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

            <div
              className={`premium-hero-scene premium-hero-scene--${scenePhase}`}
              aria-live="polite"
              aria-atomic="true"
            >
              <p className="premium-hero-subtitle mt-4 max-w-xl text-base font-medium leading-8 text-white/90 sm:text-xl sm:leading-9">
                {activeScene
                  ? toPersianDigits(activeScene.headline)
                  : null}
              </p>
              {activeScene?.support ? (
                <p className="mt-2 max-w-lg text-sm leading-7 text-white/55 sm:text-[0.95rem]">
                  {toPersianDigits(activeScene.support)}
                </p>
              ) : null}
            </div>

            {sceneCount > 1 ? (
              <div
                className="premium-hero-scene-dots mt-4"
                role="tablist"
                aria-label="صحنه‌های معرفی"
              >
                {scenes.map((scene, index) => (
                  <button
                    key={scene.id}
                    type="button"
                    role="tab"
                    aria-selected={index === sceneIndex}
                    aria-label={`صحنه ${toPersianDigits(index + 1)}: ${scene.headline}`}
                    className={`premium-hero-scene-dot${
                      index === sceneIndex ? " is-active" : ""
                    }`}
                    onClick={() => {
                      setScenePhase("in");
                      setSceneIndex(index);
                    }}
                  />
                ))}
              </div>
            ) : null}

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
            className="premium-hero-cards relative min-h-[16rem] lg:col-span-5 lg:min-h-[26rem]"
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
                      "--card-tilt": `${index % 2 === 0 ? -1.25 : 1.25}deg`,
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
