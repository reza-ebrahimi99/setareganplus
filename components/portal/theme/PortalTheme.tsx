import { PortalThemeProvider } from "@/components/portal/theme/PortalThemeProvider";
import {
  PORTAL_ACTIVE_THEME,
  type PortalThemeId,
} from "@/components/portal/theme/types";

type PortalThemeProps = {
  children: React.ReactNode;
  /**
   * Initial preference before localStorage hydrates.
   * Only enabled themes are applied (Classic today).
   */
  theme?: PortalThemeId;
  className?: string;
};

/**
 * Student Portal OS theme scope.
 * Server-safe entry that mounts the client provider (localStorage persistence).
 * Parent portal must NOT use this — keep legacy PortalShell only.
 */
export function PortalTheme({
  children,
  theme = PORTAL_ACTIVE_THEME,
  className,
}: PortalThemeProps) {
  return (
    <PortalThemeProvider defaultTheme={theme} className={className}>
      {children}
    </PortalThemeProvider>
  );
}
