import { PortalModuleHero, type PortalModuleHeroModel } from "@/components/portal/apps/PortalModuleHero";
import {
  PortalModuleQuickActions,
  type PortalModuleQuickAction,
} from "@/components/portal/apps/PortalModuleQuickActions";

type PortalModuleShellProps = {
  hero: PortalModuleHeroModel;
  actions?: readonly PortalModuleQuickAction[];
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  stickyCta?: { href: string; label: string } | null;
};

/**
 * Shared Student App layout:
 * Hero → Quick Actions → Primary + Sidebar → optional mobile sticky CTA.
 */
export function PortalModuleShell({
  hero,
  actions = [],
  children,
  sidebar,
  stickyCta = null,
}: PortalModuleShellProps) {
  return (
    <div className="portal-module-app">
      <PortalModuleHero hero={hero} />
      <PortalModuleQuickActions actions={actions} />
      <div
        className={[
          "portal-module-app__layout",
          sidebar ? "portal-module-app__layout--with-aside" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="portal-module-app__main">{children}</div>
        {sidebar ? (
          <aside className="portal-module-app__aside">{sidebar}</aside>
        ) : null}
      </div>
      {stickyCta ? (
        <div className="portal-module-sticky-cta">
          <a href={stickyCta.href} className="portal-module-sticky-cta__btn">
            {stickyCta.label}
          </a>
        </div>
      ) : null}
    </div>
  );
}
