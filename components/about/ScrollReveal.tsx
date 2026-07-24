"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms */
  delayMs?: number;
  as?: "div" | "li" | "article" | "section";
  /** Once visible, stay visible */
  once?: boolean;
};

/**
 * Fade-up on scroll via IntersectionObserver (no framer-motion).
 * Respects prefers-reduced-motion through CSS.
 */
export function ScrollReveal({
  children,
  className,
  delayMs = 0,
  as: Tag = "div",
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  const style =
    delayMs > 0
      ? ({ "--reveal-delay": `${delayMs}ms` } as CSSProperties)
      : undefined;

  return (
    <Tag
      ref={ref as never}
      className={[
        "reveal-up",
        visible ? "reveal-up--visible" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {children}
    </Tag>
  );
}
