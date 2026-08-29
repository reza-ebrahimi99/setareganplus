import type { PortalAccentId } from "@/components/portal/theme/types";

type PortalSurfaceTag = "div" | "section" | "article" | "aside" | "li";

type PortalSurfaceProps = {
  children: React.ReactNode;
  as?: PortalSurfaceTag;
  variant?: "default" | "glass" | "soft" | "flush";
  padding?: "none" | "sm" | "md" | "lg";
  accent?: PortalAccentId;
  interactive?: boolean;
  className?: string;
};

const VARIANT_CLASS: Record<NonNullable<PortalSurfaceProps["variant"]>, string> =
  {
    default: "",
    glass: "portal-surface--glass",
    soft: "portal-surface--soft",
    flush: "portal-surface--flush",
  };

const PADDING_CLASS: Record<NonNullable<PortalSurfaceProps["padding"]>, string> =
  {
    none: "",
    sm: "portal-surface--pad-sm",
    md: "portal-surface--pad-md",
    lg: "portal-surface--pad-lg",
  };

/**
 * Premium portal surface. Presentational only — no data fetching.
 * Server Component by default.
 */
export function PortalSurface({
  children,
  as: Tag = "div",
  variant = "default",
  padding = "md",
  accent,
  interactive = false,
  className,
}: PortalSurfaceProps) {
  const classes = [
    "portal-surface",
    VARIANT_CLASS[variant],
    PADDING_CLASS[padding],
    interactive ? "portal-surface--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag
      className={classes}
      {...(accent ? { "data-portal-accent": accent } : {})}
    >
      {children}
    </Tag>
  );
}
