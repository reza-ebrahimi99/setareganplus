"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { toPersianDigits } from "@/lib/persian";

export type CinematicSlide = {
  id: string;
  href: string;
  title: string;
  eyebrow: string;
  support: string;
  meta: string;
  coverUrl: string | null;
  coverAlt: string;
  accent: string | null;
  desktopFocusX: number;
  desktopFocusY: number;
  tabletFocusX: number;
  tabletFocusY: number;
  mobileFocusX: number;
  mobileFocusY: number;
  desktopZoom: number;
  tabletZoom: number;
  mobileZoom: number;
};

export type CinematicMetric = {
  metric: string;
  title: string;
  description: string;
};

export type CinematicTickerItem = {
  id: string;
  text: string;
};

export type CinematicGalleryItem = {
  id: string;
  href: string;
  title: string;
  meta: string;
  coverUrl: string | null;
  coverAlt: string;
  accent: string | null;
  tall?: boolean;
  desktopFocusX?: number;
  desktopFocusY?: number;
  tabletFocusX?: number;
  tabletFocusY?: number;
  mobileFocusX?: number;
  mobileFocusY?: number;
  desktopZoom?: number;
  tabletZoom?: number;
  mobileZoom?: number;
};

export type AchievementCinematicStageProps = {
  headingId: string;
  eyebrow: string;
  heading: string;
  description: string;
  cta: { label: string; href: string };
  slides: CinematicSlide[];
  metrics: ReadonlyArray<CinematicMetric>;
  tickerItems: ReadonlyArray<CinematicTickerItem>;
  galleryItems: ReadonlyArray<CinematicGalleryItem>;
  autoplayMs?: number;
  variant?: "home" | "page";
};

/** Per-slide framing engine: position + zoom CSS vars for each breakpoint. */
function frameStyle(slide: {
  desktopFocusX: number;
  desktopFocusY: number;
  tabletFocusX: number;
  tabletFocusY: number;
  mobileFocusX: number;
  mobileFocusY: number;
  desktopZoom: number;
  tabletZoom: number;
  mobileZoom: number;
}): CSSProperties {
  return {
    "--focus-desktop-x": `${slide.desktopFocusX}%`,
    "--focus-desktop-y": `${slide.desktopFocusY}%`,
    "--focus-tablet-x": `${slide.tabletFocusX}%`,
    "--focus-tablet-y": `${slide.tabletFocusY}%`,
    "--focus-mobile-x": `${slide.mobileFocusX}%`,
    "--focus-mobile-y": `${slide.mobileFocusY}%`,
    "--zoom-desktop": String(slide.desktopZoom),
    "--zoom-tablet": String(slide.tabletZoom),
    "--zoom-mobile": String(slide.mobileZoom),
  } as CSSProperties;
}

const PERSIAN_DIGIT_MAP: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

function toAsciiDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (d) => PERSIAN_DIGIT_MAP[d] ?? d);
}

function parseCounterTarget(
  raw: string,
): { target: number; suffix: string } | null {
  const ascii = toAsciiDigits(raw).trim();
  const match = /^(\d+)(.*)$/.exec(ascii);
  if (!match) return null;
  return { target: Number(match[1]), suffix: match[2] ?? "" };
}

function AnimatedCounter({ value }: { value: string }) {
  const [display, setDisplay] = useState(() => {
    const parsed = parseCounterTarget(value);
    return parsed
      ? toPersianDigits(`0${parsed.suffix}`)
      : toPersianDigits(value);
  });

  useEffect(() => {
    const parsed = parseCounterTarget(value);
    if (!parsed) {
      setDisplay(toPersianDigits(value));
      return;
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setDisplay(toPersianDigits(`${parsed.target}${parsed.suffix}`));
      return;
    }
    let frame = 0;
    const duration = 1400;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const current = Math.round(parsed.target * eased);
      setDisplay(toPersianDigits(`${current}${parsed.suffix}`));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return <span>{display}</span>;
}

export function AchievementCinematicStage({
  headingId,
  eyebrow,
  heading,
  description,
  cta,
  slides,
  metrics,
  tickerItems,
  galleryItems,
  autoplayMs = 8000,
  variant = "home",
}: AchievementCinematicStageProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [paused, setPaused] = useState(false);
  const reduceMotionRef = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const slideCount = slides.length;
  const active = slides[Math.min(index, Math.max(slideCount - 1, 0))] ?? null;

  const goTo = (nextIndex: number, dir: "next" | "prev") => {
    if (slideCount < 1) return;
    setDirection(dir);
    setIndex(((nextIndex % slideCount) + slideCount) % slideCount);
  };

  const goNext = () => goTo(index + 1, "next");
  const goPrev = () => goTo(index - 1, "prev");

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reduceMotionRef.current = media.matches;
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (slideCount < 2 || paused || reduceMotionRef.current) return;
    const timer = window.setInterval(() => {
      setDirection("next");
      setIndex((current) => (current + 1) % slideCount);
    }, autoplayMs);
    return () => window.clearInterval(timer);
  }, [autoplayMs, paused, slideCount]);

  const onTouchStart = (event: ReactTouchEvent<HTMLElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: ReactTouchEvent<HTMLElement>) => {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start == null || end == null) return;
    const delta = end - start;
    if (Math.abs(delta) < 48) return;
    if (delta > 0) goNext();
    else goPrev();
  };

  const onPointerEnter = () => setPaused(true);
  const onPointerLeave = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setPaused(false);
  };

  const tickerLoop =
    tickerItems.length > 0 ? [...tickerItems, ...tickerItems] : [];

  return (
    <section
      aria-labelledby={headingId}
      className={`achievement-cinema achievement-cinema--${variant}`}
    >
      {tickerLoop.length > 0 ? (
        <div
          className="achievement-cinema-ticker"
          role="region"
          aria-label="آخرین افتخارات"
        >
          <div className="achievement-cinema-ticker-track">
            {tickerLoop.map((item, i) => (
              <span
                key={`${item.id}-${i}`}
                className="achievement-cinema-ticker-item"
                aria-hidden={i >= tickerItems.length ? true : undefined}
              >
                <span aria-hidden="true">★</span>
                {toPersianDigits(item.text)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className="achievement-cinema-stage"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        {slides.map((slide, slideIndex) => {
          const isActive = slideIndex === index;
          return (
            <article
              key={slide.id}
              className={`achievement-cinema-slide${
                isActive ? " is-active" : ""
              } achievement-cinema-slide--${direction}`}
              aria-hidden={!isActive}
            >
              <div
                className="achievement-cinema-media"
                aria-hidden="true"
                style={frameStyle(slide)}
              >
                {slide.coverUrl ? (
                  <Image
                    src={slide.coverUrl}
                    alt=""
                    fill
                    unoptimized
                    priority={slideIndex === 0}
                    sizes="100vw"
                    className="achievement-cinema-photo object-cover"
                  />
                ) : (
                  <div
                    className="achievement-cinema-fallback"
                    style={
                      slide.accent
                        ? {
                            background: `radial-gradient(circle at 70% 20%, ${slide.accent}55, transparent 42%), linear-gradient(145deg, #0b1220, #0f172a 55%, #1e293b)`,
                          }
                        : undefined
                    }
                  />
                )}
                <div className="achievement-cinema-veil" />
                <div className="achievement-cinema-spotlight" />
                <div className="achievement-cinema-glass" />
              </div>
            </article>
          );
        })}

        {active ? (
          <div className="achievement-cinema-foreground">
            <div
              className={`achievement-cinema-copy achievement-cinema-copy--${direction}`}
              key={`copy-${active.id}`}
            >
              <p className="achievement-cinema-eyebrow">
                {toPersianDigits(active.eyebrow || eyebrow)}
              </p>
              <p className="achievement-cinema-kicker">
                {toPersianDigits(heading)}
              </p>
              <h2 id={headingId} className="achievement-cinema-title">
                {toPersianDigits(active.title)}
              </h2>
              <p className="achievement-cinema-support">
                {toPersianDigits(active.support || description)}
              </p>
              {active.meta ? (
                <p className="achievement-cinema-meta">
                  {toPersianDigits(active.meta)}
                </p>
              ) : null}
              <div className="achievement-cinema-actions">
                <Link
                  href={active.href}
                  className="achievement-cinema-btn achievement-cinema-btn--primary"
                >
                  مشاهده این افتخار
                </Link>
                <Link
                  href={cta.href}
                  className="achievement-cinema-btn achievement-cinema-btn--ghost"
                >
                  {cta.label}
                </Link>
              </div>
            </div>

            <aside
              className={`achievement-cinema-panel achievement-cinema-panel--${
                direction === "next" ? "from-start" : "from-end"
              }`}
              key={`panel-${active.id}`}
              aria-hidden="true"
            >
              <p className="achievement-cinema-panel-label">ویترین زنده</p>
              <p className="achievement-cinema-panel-title">
                {toPersianDigits(active.title)}
              </p>
              <p className="achievement-cinema-panel-text">
                {toPersianDigits(active.support || description)}
              </p>
            </aside>
          </div>
        ) : null}

        {slideCount > 1 ? (
          <>
            <button
              type="button"
              className="achievement-cinema-nav achievement-cinema-nav--prev"
              aria-label="اسلاید قبلی"
              onClick={goPrev}
            >
              ‹
            </button>
            <button
              type="button"
              className="achievement-cinema-nav achievement-cinema-nav--next"
              aria-label="اسلاید بعدی"
              onClick={goNext}
            >
              ›
            </button>
            <div
              className="achievement-cinema-dots"
              role="tablist"
              aria-label="اسلایدهای افتخارات"
            >
              {slides.map((slide, slideIndex) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={slideIndex === index}
                  aria-label={`اسلاید ${toPersianDigits(slideIndex + 1)}: ${slide.title}`}
                  className={`achievement-cinema-dot${
                    slideIndex === index ? " is-active" : ""
                  }`}
                  onClick={() =>
                    goTo(slideIndex, slideIndex > index ? "next" : "prev")
                  }
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {metrics.length > 0 ? (
        <div className="achievement-cinema-counters">
          <ul>
            {metrics.map((item, metricIndex) => (
              <li
                key={item.title}
                className="achievement-cinema-counter"
                style={{ "--i": metricIndex } as CSSProperties}
              >
                <p className="achievement-cinema-counter-value">
                  <AnimatedCounter value={item.metric} />
                </p>
                <p className="achievement-cinema-counter-title">
                  {toPersianDigits(item.title)}
                </p>
                <p className="achievement-cinema-counter-desc">
                  {toPersianDigits(item.description)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {galleryItems.length > 0 ? (
        <div className="achievement-cinema-masonry-wrap">
          <div className="achievement-cinema-masonry-head">
            <h3>{toPersianDigits("گالری زنده افتخارات")}</h3>
            <p>{toPersianDigits(description)}</p>
          </div>
          <div className="achievement-cinema-masonry">
            {galleryItems.map((item, galleryIndex) => (
              <Link
                key={item.id}
                href={item.href}
                className={`achievement-cinema-tile${
                  item.tall ? " achievement-cinema-tile--tall" : ""
                } achievement-cinema-tile--enter-${
                  galleryIndex % 2 === 0 ? "start" : "end"
                }`}
                style={{ "--i": galleryIndex } as CSSProperties}
              >
                <span
                  className="achievement-cinema-tile-media"
                  aria-hidden="true"
                >
                  {item.coverUrl ? (
                    <Image
                      src={item.coverUrl}
                      alt=""
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="achievement-cinema-photo object-cover"
                      style={frameStyle({
                        desktopFocusX: item.desktopFocusX ?? 50,
                        desktopFocusY: item.desktopFocusY ?? 42,
                        tabletFocusX: item.tabletFocusX ?? 50,
                        tabletFocusY: item.tabletFocusY ?? 40,
                        mobileFocusX: item.mobileFocusX ?? 50,
                        mobileFocusY: item.mobileFocusY ?? 35,
                        desktopZoom: item.desktopZoom ?? 1,
                        tabletZoom: item.tabletZoom ?? 1,
                        mobileZoom: item.mobileZoom ?? 1,
                      })}
                    />
                  ) : (
                    <span
                      className="achievement-cinema-tile-fallback"
                      style={
                        item.accent
                          ? { backgroundColor: `${item.accent}33` }
                          : undefined
                      }
                    />
                  )}
                </span>
                <span className="achievement-cinema-tile-glass">
                  <span className="achievement-cinema-tile-title">
                    {toPersianDigits(item.title)}
                  </span>
                  {item.meta ? (
                    <span className="achievement-cinema-tile-meta">
                      {toPersianDigits(item.meta)}
                    </span>
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
