"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import type { PublicAchievementCard } from "@/lib/website/achievements";
import { toPersianDigits } from "@/lib/persian";

const AUTOPLAY_MS = 5200;

type FeaturedAchievementSliderProps = {
  achievements: PublicAchievementCard[];
};

export function FeaturedAchievementSlider({
  achievements,
}: FeaturedAchievementSliderProps) {
  const slides = achievements;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const dragStartX = useRef<number | null>(null);

  const count = slides.length;
  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count <= 1 || paused) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index + 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index - 1);
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    dragStartX.current = event.clientX;
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartX.current === null) return;
    const delta = event.clientX - dragStartX.current;
    dragStartX.current = null;
    if (Math.abs(delta) < 48) return;
    // RTL: swipe left (negative delta in LTR coords) advances
    if (delta < 0) go(index + 1);
    else go(index - 1);
  }

  const current = slides[index]!;

  return (
    <div
      className="featured-achievement-slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      role="region"
      aria-roledescription="carousel"
      aria-label="افتخارات برجسته"
      tabIndex={0}
    >
      <div
        key={current.id}
        className="featured-achievement-slide"
      >
        <AchievementCard
          achievement={current}
          size="spotlight"
          featured
          priority={index === 0}
        />
      </div>

      {count > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2" role="tablist" aria-label="انتخاب اسلاید">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={slideIndex === index}
                aria-label={`اسلاید ${toPersianDigits(slideIndex + 1)}`}
                className={`featured-achievement-dot${
                  slideIndex === index ? " featured-achievement-dot--active" : ""
                }`}
                onClick={() => setIndex(slideIndex)}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="featured-achievement-nav"
              aria-label="قبلی"
              onClick={() => go(index - 1)}
            >
              ›
            </button>
            <button
              type="button"
              className="featured-achievement-nav"
              aria-label="بعدی"
              onClick={() => go(index + 1)}
            >
              ‹
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
