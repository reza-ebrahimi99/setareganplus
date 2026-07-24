"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type ParallaxBackgroundProps = {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
};

/**
 * Subtle vertical parallax on scroll. Disabled under prefers-reduced-motion.
 */
export function ParallaxBackground({
  src,
  alt,
  priority,
  className,
}: ParallaxBackgroundProps) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setOffset(window.scrollY * 0.22);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden={alt === "" ? true : undefined}
      className="absolute inset-0 overflow-hidden"
      style={{ transform: `translate3d(0, ${offset}px, 0) scale(1.12)` }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        className={className ?? "object-cover object-center"}
        sizes="100vw"
      />
    </div>
  );
}
