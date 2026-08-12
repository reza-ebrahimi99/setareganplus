"use client";

import { useId } from "react";

type AtrinMarkProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

/**
 * Atrin identity mark — glowing circular orb with a geometric
 * knowledge / growth / guidance glyph (not star, robot, brain, or chat).
 */
export function AtrinMark({ className = "", size = "md" }: AtrinMarkProps) {
  const uid = useId().replace(/:/g, "");
  const dim =
    size === "sm" ? "size-9" : size === "lg" ? "size-[4.25rem]" : "size-12";
  const glyph =
    size === "lg" ? "size-9" : size === "sm" ? "size-[1.15rem]" : "size-[1.45rem]";

  return (
    <span
      aria-hidden
      className={`atrin-mark-orb relative inline-flex ${dim} shrink-0 items-center justify-center rounded-full ${className}`}
    >
      <span className="atrin-mark-orb__glow" />
      <span className="atrin-mark-orb__ring" />
      <svg
        viewBox="0 0 32 32"
        className={`relative z-[1] ${glyph}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`${uid}-stroke`} x1="6" y1="28" x2="26" y2="4">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="55%" stopColor="#E0E7FF" />
            <stop offset="100%" stopColor="#C4B5FD" />
          </linearGradient>
          <linearGradient id={`${uid}-core`} x1="12" y1="8" x2="20" y2="18">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#A5B4FC" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id={`${uid}-node`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#818CF8" />
          </radialGradient>
        </defs>

        {/* Ascending growth path — left rail */}
        <path
          d="M9.5 23.5C11.2 19.8 12.4 16.2 14.2 12.4"
          stroke={`url(#${uid}-stroke)`}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        {/* Ascending growth path — right rail */}
        <path
          d="M22.5 23.5C20.8 19.8 19.6 16.2 17.8 12.4"
          stroke={`url(#${uid}-stroke)`}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        {/* Knowledge base / open foundation */}
        <path
          d="M8 24.2H24"
          stroke={`url(#${uid}-stroke)`}
          strokeWidth="1.55"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Guidance axis */}
        <path
          d="M16 22.8V10.2"
          stroke={`url(#${uid}-stroke)`}
          strokeWidth="1.45"
          strokeLinecap="round"
          opacity="0.9"
        />
        {/* Milestone nodes — growth steps */}
        <circle cx="11.6" cy="18.6" r="1.15" fill={`url(#${uid}-node)`} />
        <circle cx="20.4" cy="18.6" r="1.15" fill={`url(#${uid}-node)`} />
        {/* Apex — guided knowledge point */}
        <circle
          cx="16"
          cy="8.6"
          r="2.35"
          fill={`url(#${uid}-core)`}
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="0.6"
        />
        <circle cx="16" cy="8.6" r="0.85" fill="rgba(255,255,255,0.95)" />
      </svg>
    </span>
  );
}
