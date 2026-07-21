"use client";

import Image from "next/image";
import { useState } from "react";
import {
  GalleryLightbox,
  type GalleryLightboxItem,
} from "@/components/gallery/GalleryLightbox";

type GalleryMasonryProps = {
  items: GalleryLightboxItem[];
};

export function GalleryMasonry({ items }: GalleryMasonryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-white px-4 py-10 text-center text-sm text-muted">
        تصویری برای نمایش وجود ندارد.
      </p>
    );
  }

  return (
    <>
      <ul className="columns-1 gap-3 sm:columns-2 sm:gap-4 lg:columns-3">
        {items.map((item, index) => (
          <li key={item.id} className="mb-3 break-inside-avoid sm:mb-4">
            <button
              type="button"
              onClick={() => setActiveIndex(index)}
              className="group block w-full overflow-hidden rounded-2xl border border-border bg-white text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:ring-offset-2"
              aria-label={`نمایش بزرگ: ${item.title}`}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-primary/[0.03]">
                <Image
                  src={item.url}
                  alt={item.alt || item.title}
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <div className="space-y-1 p-3.5">
                <p className="text-sm font-semibold text-primary">{item.title}</p>
                {item.caption ? (
                  <p className="text-xs leading-6 text-muted">{item.caption}</p>
                ) : null}
              </div>
            </button>
          </li>
        ))}
      </ul>

      <GalleryLightbox
        items={items}
        initialIndex={activeIndex}
        onClose={() => setActiveIndex(null)}
      />
    </>
  );
}
