import Link from "next/link";
import { PortalSurface } from "@/components/portal/PortalSurface";
import type { PortalAccentId } from "@/components/portal/theme/types";

type PortalWidgetAction = {
  href: string;
  label: string;
};

type PortalWidgetProps = {
  title: string;
  description?: string;
  action?: PortalWidgetAction;
  accent?: PortalAccentId;
  variant?: "default" | "glass" | "soft";
  /** When true, renders empty state instead of children. */
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  headerClassName?: string;
};

/**
 * Reusable portal widget chrome.
 * Pages compose widgets; widgets only render props (no business logic).
 * Server Component by default.
 */
export function PortalWidget({
  title,
  description,
  action,
  accent,
  variant = "default",
  empty = false,
  emptyTitle = "هنوز محتوایی نیست",
  emptyDescription = "به‌محض آماده شدن، اینجا نمایش داده می‌شود.",
  emptyIcon,
  children,
  className,
  headerClassName,
}: PortalWidgetProps) {
  return (
    <PortalSurface
      as="section"
      variant={variant}
      padding="md"
      accent={accent}
      className={className}
    >
      <header
        className={["portal-widget__header", headerClassName]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="min-w-0">
          <h2 className="portal-widget__title">{title}</h2>
          {description ? (
            <p className="portal-widget__description">{description}</p>
          ) : null}
        </div>
        {action ? (
          <Link href={action.href} className="portal-widget__action">
            {action.label}
          </Link>
        ) : null}
      </header>

      {empty ? (
        <div className="portal-widget__empty" role="status">
          <div className="portal-widget__empty-icon" aria-hidden="true">
            {emptyIcon ?? "·"}
          </div>
          <p className="portal-widget__empty-title">{emptyTitle}</p>
          <p className="portal-widget__empty-description">{emptyDescription}</p>
        </div>
      ) : (
        children
      )}
    </PortalSurface>
  );
}
