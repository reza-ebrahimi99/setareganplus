import { PortalTheme } from "@/components/portal/theme/PortalTheme";
import { StudentPortalChrome } from "@/components/portal/chrome/StudentPortalChrome";
import type { PortalOsNavSection } from "@/components/portal/nav/types";

type StudentPortalShellProps = {
  children: React.ReactNode;
  sections: readonly PortalOsNavSection[];
  userDisplayName: string;
  organizationName: string;
  showAccountSwitcher?: boolean;
};

/**
 * Student Portal Operating System shell.
 * Parent portal must keep using legacy `PortalShell` (no Portal OS).
 */
export function StudentPortalShell({
  children,
  sections,
  userDisplayName,
  organizationName,
  showAccountSwitcher = false,
}: StudentPortalShellProps) {
  return (
    <PortalTheme>
      <StudentPortalChrome
        sections={sections}
        userDisplayName={userDisplayName}
        organizationName={organizationName}
        showAccountSwitcher={showAccountSwitcher}
      >
        {children}
      </StudentPortalChrome>
    </PortalTheme>
  );
}
