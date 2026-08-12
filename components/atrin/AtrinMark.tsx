"use client";

type AtrinMarkProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

/**
 * Premium star-inspired glass mark — no robot / AI glyph.
 */
export function AtrinMark({ className = "", size = "md" }: AtrinMarkProps) {
  const dim =
    size === "sm" ? "size-9" : size === "lg" ? "size-16" : "size-11";
  const star =
    size === "lg" ? "size-8" : size === "sm" ? "size-4" : "size-5";

  return (
    <span
      aria-hidden
      className={`atrin-mark-glass relative inline-flex ${dim} items-center justify-center rounded-2xl ${className}`}
    >
      <svg
        viewBox="0 0 32 32"
        className={star}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="atrinStarFill" x1="6" y1="2" x2="26" y2="30">
            <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#A5B4FC" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#67E8F9" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <path
          d="M16 3.2 18.9 11.1 27.2 12.2 21 18.1 22.8 26.4 16 21.9 9.2 26.4 11 18.1 4.8 12.2 13.1 11.1 16 3.2Z"
          fill="url(#atrinStarFill)"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="15.2" r="2.1" fill="rgba(255,255,255,0.92)" />
      </svg>
    </span>
  );
}
