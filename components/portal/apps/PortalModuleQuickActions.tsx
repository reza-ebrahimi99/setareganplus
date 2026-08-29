import Link from "next/link";
import { PortalIcon, type PortalIconName } from "@/components/portal/icons";
import type { PortalAccentId } from "@/components/portal/theme/types";

export type PortalModuleQuickAction = {
  id: string;
  href: string;
  label: string;
  description: string;
  icon: PortalIconName;
  accent: PortalAccentId;
};

type PortalModuleQuickActionsProps = {
  title?: string;
  support?: string;
  actions: readonly PortalModuleQuickAction[];
};

export function PortalModuleQuickActions({
  title = "اقدامات سریع",
  support = "عملیات فوری این بخش — نه منوی کامل پرتال.",
  actions,
}: PortalModuleQuickActionsProps) {
  if (actions.length === 0) return null;

  return (
    <section className="portal-module-actions" aria-label={title}>
      <div className="portal-module-actions__header">
        <h2 className="portal-section-title">{title}</h2>
        <p className="portal-section-support">{support}</p>
      </div>
      <ul className="portal-module-actions__grid">
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
