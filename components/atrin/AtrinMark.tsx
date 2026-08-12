"use client";

type AtrinMarkProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function AtrinMark({ className = "", size = "md" }: AtrinMarkProps) {
  const dim =
    size === "sm" ? "size-9" : size === "lg" ? "size-16" : "size-11";

  return (
    <span
      aria-hidden
      className={`relative inline-flex ${dim} items-center justify-center rounded-2xl atrin-glow-ring ${className}`}
      style={{
        background:
          "linear-gradient(145deg, #7c3aed 0%, #4c1d95 55%, #0e7490 100%)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        className={size === "lg" ? "size-8" : "size-5"}
        fill="none"
        stroke="white"
        strokeWidth="1.6"
      >
        <path d="M12 3.5 4.5 8v8L12 20.5 19.5 16V8L12 3.5Z" />
        <path d="M12 8.5v7M9 11.5h6" />
        <circle cx="12" cy="12" r="1.2" fill="white" stroke="none" />
      </svg>
      <span className="absolute -end-0.5 -top-0.5 size-2.5 rounded-full bg-[#22d3ee] shadow-[0_0_10px_#22d3ee]" />
    </span>
  );
}
