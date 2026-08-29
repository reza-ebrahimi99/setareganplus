import Link from "next/link";
import { PortalSurface } from "@/components/portal/PortalSurface";
import {
  PortalIcon,
  PORTAL_ICON_NAMES,
  type PortalIconName,
} from "@/components/portal/icons";
import type { PortalAccentId } from "@/components/portal/theme/types";

/**
 * Universal Student Portal widget abstraction.
 * Every future module (Guidance, Assessments, AI, Homework, Notifications,
 * Calendar, …) composes through this — pages never invent one-off card shells.
 *
 * Contract: receive data → render. No fetching, no mutations, no permissions.
 */

export const PORTAL_WIDGET_MODULES = [
  "generic",
  "progress",
  "guidance",
  "assessments",
  "achievements",
  "activity",
  "schedule",
  "notifications",
  "quick-actions",
  "modules",
  "ai",
  "homework",
  "calendar",
] as const;

export type PortalWidgetModule = (typeof PORTAL_WIDGET_MODULES)[number];

export type PortalWidgetAction = {
  href: string;
  label: string;
};

export type PortalWidgetProps = {
  /** Stable widget id for analytics / layout keys. */
  id?: string;
  /** Module taxonomy — drives default accent when accent omitted. */
  module?: PortalWidgetModule;
  title: string;
  description?: string;
  /** Named portal icon (preferred) or custom node. */
  icon?: PortalIconName | React.ReactNode;
  /** Live status chip / badge — omit when no real data. */
  status?: React.ReactNode;
  /** Secondary meta row under title (phase, date, %). */
  meta?: React.ReactNode;
  action?: PortalWidgetAction;
  footer?: React.ReactNode;
  accent?: PortalAccentId;
  variant?: "default" | "glass" | "soft";
  size?: "sm" | "md" | "lg";
  /** Skeleton placeholder without inventing data. */
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
};

const MODULE_DEFAULT_ACCENT: Record<PortalWidgetModule, PortalAccentId> = {
  generic: "gold",
  progress: "emerald",
  guidance: "gold",
  assessments: "blue",
  achievements: "orange",
  activity: "teal",
  schedule: "purple",
  notifications: "pink",
  "quick-actions": "blue",
  modules: "purple",
  ai: "purple",
  homework: "teal",
  calendar: "orange",
};

const SIZE_PADDING: Record<
  NonNullable<PortalWidgetProps["size"]>,
  "sm" | "md" | "lg"
> = {
  sm: "sm",
  md: "md",
  lg: "lg",
};

function isPortalIconName(value: unknown): value is PortalIconName {
  return (
    typeof value === "string" &&
    (PORTAL_ICON_NAMES as readonly string[]).includes(value)
  );
}

function renderIcon(
  icon: PortalIconName | React.ReactNode | undefined,
): React.ReactNode {
  if (!icon) return null;
  if (isPortalIconName(icon)) {
    return <PortalIcon name={icon} className="size-5" />;
  }
  return icon;
}

/**
 * Universal portal widget chrome.
 * Server Component by default — pass interactive children as client islands.
 */
export function PortalWidget({
  id,
  module = "generic",
  title,
  description,
  icon,
  status,
  meta,
  action,
  footer,
  accent,
  variant = "default",
  size = "md",
  loading = false,
  empty = false,
  emptyTitle = "هنوز محتوایی نیست",
  emptyDescription = "به‌محض آماده شدن، اینجا نمایش داده می‌شود.",
  emptyIcon,
  children,
  className,
  headerClassName,
  bodyClassName,
}: PortalWidgetProps) {
  const resolvedAccent = accent ?? MODULE_DEFAULT_ACCENT[module];
  const iconNode = renderIcon(icon);

  return (
    <PortalSurface
      as="section"
      variant={variant}
      padding={SIZE_PADDING[size]}
      accent={resolvedAccent}
      className={["portal-widget", className].filter(Boolean).join(" ")}
      dataAttributes={{
        "data-portal-widget-module": module,
        ...(id ? { "data-portal-widget-id": id } : {}),
      }}
    >
      <header
        className={["portal-widget__header", headerClassName]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="portal-widget__heading min-w-0">
          <div className="portal-widget__title-row">
            {iconNode ? (
              <span className="portal-widget__icon" aria-hidden="true">
                {iconNode}
              </span>
            ) : null}
            <h2 className="portal-widget__title">{title}</h2>
            {status ? (
              <div className="portal-widget__status">{status}</div>
            ) : null}
          </div>
          {description ? (
            <p className="portal-widget__description">{description}</p>
          ) : null}
          {meta ? <div className="portal-widget__meta">{meta}</div> : null}
        </div>
        {action ? (
          <Link href={action.href} className="portal-widget__action">
            {action.label}
          </Link>
        ) : null}
      </header>

      <div className={["portal-widget__body", bodyClassName].filter(Boolean).join(" ")}>
        {loading ? (
          <div className="portal-widget__loading" aria-busy="true" aria-live="polite">
            <span className="portal-widget__skeleton" />
            <span className="portal-widget__skeleton portal-widget__skeleton--short" />
          </div>
        ) : empty ? (
          <div className="portal-widget__empty" role="status">
            <div className="portal-widget__empty-icon" aria-hidden="true">
              {emptyIcon ?? renderIcon(typeof icon === "string" ? icon : undefined) ?? "·"}
            </div>
            <p className="portal-widget__empty-title">{emptyTitle}</p>
            <p className="portal-widget__empty-description">{emptyDescription}</p>
          </div>
        ) : (
          children
        )}
      </div>

      {footer && !loading && !empty ? (
        <footer className="portal-widget__footer">{footer}</footer>
      ) : null}
    </PortalSurface>
  );
}
