import Link from "next/link";
import { PortalIcon } from "@/components/portal/icons";
import type { PortalQuickAction } from "@/lib/portal/student/home-presentation";

type PortalQuickActionsWidgetProps = {
  actions: readonly PortalQuickAction[];
};

/** Immediate operations — not a second navigation rail. */
export function PortalQuickActionsWidget({
  actions,
}: PortalQuickActionsWidgetProps) {
  if (actions.length === 0) return null;

  return (
    <section className="portal-quick-actions" aria-label="اقدامات سریع">
      <div className="portal-quick-actions__header">
        <h2 className="portal-section-title">اقدامات امروز</h2>
        <p className="portal-section-support">
          کارهای فوری — نه منوی کامل پرتال.
        </p>
      </div>
      <ul className="portal-quick-actions__grid">
        {actions.map((action) => (
          <li key={action.id}>
            <Link
              href={action.href}
              className="portal-quick-action"
              data-portal-accent={action.accent}
            >
              <span className="portal-quick-action__icon" aria-hidden="true">
                <PortalIcon name={action.icon} className="size-6" />
              </span>
              <span className="portal-quick-action__text">
                <span className="portal-quick-action__label">{action.label}</span>
                <span className="portal-quick-action__desc">
                  {action.description}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
