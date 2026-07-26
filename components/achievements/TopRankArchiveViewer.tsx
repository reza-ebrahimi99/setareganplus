"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { toPersianDigits } from "@/lib/persian";
import type { PublicTopRankArchiveItem } from "@/lib/website/top-rank-archive-public";

type TopRankArchiveViewerProps = {
  items: PublicTopRankArchiveItem[];
};

export function TopRankArchiveViewer({ items }: TopRankArchiveViewerProps) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageReady, setImageReady] = useState(false);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );

  const selectedIndex = useMemo(
    () => (selected ? items.findIndex((item) => item.id === selected.id) : -1),
    [items, selected],
  );

  useEffect(() => {
    setImageReady(false);
  }, [selected?.id]);

  if (items.length === 0 || !selected) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center"
      >
        <p className="text-base font-semibold text-primary">
          هنوز آرشیوی منتشر نشده است
        </p>
        <p className="mt-2 text-sm leading-7 text-muted">
          به‌محض انتشار تصاویر رتبه‌های برتر به تفکیک سال، در این صفحه نمایش داده
          می‌شوند.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div
        className="relative -mx-1"
        role="tablist"
        aria-label="سال‌های آرشیو رتبه‌های برتر"
      >
        <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2 scroll-smooth md:flex-wrap md:overflow-visible md:pb-0">
          {items.map((item) => {
            const active = item.id === selected.id;
            return (
              <li key={item.id} className="snap-start shrink-0">
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedId(item.id)}
                  className={
                    active
                      ? "min-h-11 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm"
                      : "min-h-11 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-primary hover:border-secondary/50"
                  }
                >
                  {toPersianDigits(item.year)}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <header className="border-b border-border px-5 py-4 sm:px-6">
          <p className="text-xs font-medium tracking-wide text-secondary">
            سال {toPersianDigits(selected.year)}
          </p>
          <h2 className="mt-1 text-xl font-bold text-primary sm:text-2xl">
            {toPersianDigits(selected.title)}
          </h2>
          {selected.description ? (
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted sm:text-base sm:leading-8">
              {selected.description}
            </p>
          ) : null}
        </header>

        <div className="relative bg-primary/[0.02] px-3 py-4 sm:px-6 sm:py-6">
          {!imageReady ? (
            <div
              className="absolute inset-3 animate-pulse rounded-xl bg-slate-200/70 sm:inset-6"
              aria-hidden="true"
            />
          ) : null}
          <div className="relative mx-auto w-full max-w-5xl">
            <div
              className="relative w-full overflow-hidden rounded-xl bg-white"
              style={{
                aspectRatio:
                  selected.width && selected.height
                    ? `${selected.width} / ${selected.height}`
                    : "4 / 3",
              }}
            >
              <Image
                src={selected.imageUrl}
                alt={selected.imageAlt}
                fill
                unoptimized
                priority
                sizes="(max-width: 1024px) 100vw, 960px"
                className="object-contain"
                onLoad={() => setImageReady(true)}
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-primary shadow-sm hover:bg-secondary/90"
            >
              مشاهده تصویر کامل
            </button>
          </div>
        </div>
      </article>

      {lightboxOpen ? (
        <TopRankZoomLightbox
          items={items}
          initialIndex={Math.max(0, selectedIndex)}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={(index) => {
            const next = items[index];
            if (next) setSelectedId(next.id);
          }}
        />
      ) : null}
    </div>
  );
}

function TopRankZoomLightbox({
  items,
  initialIndex,
  onClose,
  onIndexChange,
}: {
  items: PublicTopRankArchiveItem[];
  initialIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const titleId = useId();
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });
  const current = items[Math.min(index, items.length - 1)] ?? null;

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const goPrev = useCallback(() => {
    setIndex((value) => {
      const next = (value - 1 + items.length) % items.length;
      onIndexChange(next);
      return next;
    });
    resetView();
  }, [items.length, onIndexChange, resetView]);

  const goNext = useCallback(() => {
    setIndex((value) => {
      const next = (value + 1) % items.length;
      onIndexChange(next);
      return next;
    });
    resetView();
  }, [items.length, onIndexChange, resetView]);

  useEffect(() => {
    setIndex(initialIndex);
    resetView();
  }, [initialIndex, resetView]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goNext();
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setScale((value) => Math.min(4, value + 0.25));
      } else if (event.key === "-") {
        event.preventDefault();
        setScale((value) => Math.max(1, value - 0.25));
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, goPrev, goNext]);

  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[90] flex flex-col bg-primary/95"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0">
          <h2 id={titleId} className="truncate text-base font-semibold">
            {toPersianDigits(current.title)}
          </h2>
          <p className="text-xs text-white/70">
            سال {toPersianDigits(current.year)} · زوم با اسکرول یا دکمه‌ها · جابه‌جایی با کشیدن
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="min-h-10 rounded-xl border border-white/20 px-3 text-sm"
            onClick={() => setScale((value) => Math.max(1, value - 0.25))}
            aria-label="کوچک‌نمایی"
          >
            −
          </button>
          <button
            type="button"
            className="min-h-10 rounded-xl border border-white/20 px-3 text-sm"
            onClick={() => setScale((value) => Math.min(4, value + 0.25))}
            aria-label="بزرگ‌نمایی"
          >
            +
          </button>
          <button
            type="button"
            className="min-h-10 rounded-xl border border-white/20 px-3 text-sm"
            onClick={onClose}
            aria-label="بستن"
          >
            بستن
          </button>
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        onWheel={(event) => {
          event.preventDefault();
          const delta = event.deltaY > 0 ? -0.15 : 0.15;
          setScale((value) => Math.min(4, Math.max(1, value + delta)));
        }}
        onPointerDown={(event) => {
          if (scale <= 1) return;
          dragging.current = true;
          lastPoint.current = { x: event.clientX, y: event.clientY };
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragging.current) return;
          const dx = event.clientX - lastPoint.current.x;
          const dy = event.clientY - lastPoint.current.y;
          lastPoint.current = { x: event.clientX, y: event.clientY };
          setOffset((value) => ({ x: value.x + dx, y: value.y + dy }));
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        <button
          type="button"
          onClick={goPrev}
          className="absolute start-3 z-10 hidden min-h-11 min-w-11 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm sm:inline-flex sm:items-center sm:justify-center"
          aria-label="سال قبلی"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goNext}
          className="absolute end-3 z-10 hidden min-h-11 min-w-11 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm sm:inline-flex sm:items-center sm:justify-center"
          aria-label="سال بعدی"
        >
          ›
        </button>

        <div
          className="relative max-h-full max-w-full touch-none"
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
            transition: dragging.current ? "none" : "transform 120ms ease-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.imageUrl}
            alt={current.imageAlt}
            className="max-h-[min(85vh,900px)] max-w-[min(96vw,1200px)] object-contain select-none"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
