"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useState } from "react";

export type GalleryLightboxItem = {
  id: string;
  url: string;
  alt: string;
  title: string;
  caption: string | null;
};

type GalleryLightboxProps = {
  items: GalleryLightboxItem[];
  initialIndex: number | null;
  onClose: () => void;
};

export function GalleryLightbox({
  items,
  initialIndex,
  onClose,
}: GalleryLightboxProps) {
  const titleId = useId();
  const [index, setIndex] = useState(initialIndex ?? 0);
  const open = initialIndex != null && items.length > 0;
  const current = open ? items[Math.min(index, items.length - 1)] : null;

  useEffect(() => {
    if (initialIndex != null) setIndex(initialIndex);
  }, [initialIndex]);

  const goPrev = useCallback(() => {
    setIndex((value) => (value - 1 + items.length) % items.length);
  }, [items.length]);

  const goNext = useCallback(() => {
    setIndex((value) => (value + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        // RTL: right arrow goes to previous visually
        goPrev();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goNext();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, goPrev, goNext]);

  if (!open || !current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-primary/90 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="truncate text-base font-semibold text-primary"
            >
              {current.title}
            </h2>
            {current.caption ? (
              <p className="mt-1 text-sm leading-6 text-muted">{current.caption}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-xl border border-border bg-white text-sm"
            aria-label="بستن نمایش بزرگ"
          >
            بستن
          </button>
        </div>

        <div className="relative min-h-[50vh] flex-1 bg-primary/[0.04]">
          <Image
            src={current.url}
            alt={current.alt || current.title}
            fill
            unoptimized
            className="object-contain p-2"
            sizes="100vw"
            priority
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={goNext}
            className="min-h-11 rounded-xl border border-border bg-white px-4 text-sm"
            aria-label="تصویر بعدی"
          >
            بعدی
          </button>
          <p className="text-xs text-muted" aria-live="polite">
            {index + 1} / {items.length}
          </p>
          <button
            type="button"
            onClick={goPrev}
            className="min-h-11 rounded-xl border border-border bg-white px-4 text-sm"
            aria-label="تصویر قبلی"
          >
            قبلی
          </button>
        </div>
      </div>
    </div>
  );
}
