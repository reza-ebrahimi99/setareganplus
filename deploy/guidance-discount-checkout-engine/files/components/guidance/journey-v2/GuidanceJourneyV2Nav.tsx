"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type GuidanceJourneyV2NavProps = {
  previous?: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
  };
  next?: {
    label: string;
    type?: "submit" | "button";
    onClick?: () => void;
    disabled?: boolean;
    pending?: boolean;
    pendingLabel?: string;
  };
  leading?: ReactNode;
};

function NavArrow({ direction }: { direction: "next" | "prev" }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {direction === "next" ? (
        <path
          d="M12.5 4.5 6.5 10l6 5.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M7.5 4.5 13.5 10l-6 5.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/**
 * Shared V2 step footer. Presentation only — callers keep their own hrefs/actions.
 */
export function GuidanceJourneyV2Nav({
  previous,
  next,
  leading,
}: GuidanceJourneyV2NavProps) {
  return (
    <div className="gjv2-nav">
      {leading ? <div className="gjv2-nav__leading">{leading}</div> : null}

      {previous ? (
        <button
          type="button"
          className="gjv2-nav__button gjv2-nav__button--prev"
          onClick={previous.onClick}
          disabled={previous.disabled}
        >
          <NavArrow direction="prev" />
          <span>{previous.label}</span>
        </button>
      ) : (
        <span className="gjv2-nav__spacer" />
      )}

      {next ? (
        <button
          type={next.type ?? "submit"}
          className="gjv2-nav__button gjv2-nav__button--next"
          onClick={next.onClick}
          disabled={next.disabled || next.pending}
        >
          {next.pending ? (
            <span className="gjv2-nav__spinner" aria-hidden="true" />
          ) : null}
          <span>
            {next.pending ? (next.pendingLabel ?? "در حال ذخیره…") : next.label}
          </span>
          {next.pending ? null : <NavArrow direction="next" />}
        </button>
      ) : null}
    </div>
  );
}

export function GuidanceJourneyV2TextButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      className={["gjv2-nav__text", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
