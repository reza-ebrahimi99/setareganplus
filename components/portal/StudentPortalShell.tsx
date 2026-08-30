import { PortalTheme } from "@/components/portal/theme/PortalTheme";
import { StudentPortalChrome } from "@/components/portal/chrome/StudentPortalChrome";
import type { PortalOsNavSection } from "@/components/portal/nav/types";

type StudentPortalShellProps = {
  children: React.ReactNode;
  sections: readonly PortalOsNavSection[];
  guidanceSections?: readonly PortalOsNavSection[] | null;
  userDisplayName: string;
  organizationName: string;
  showAccountSwitcher?: boolean;
};

/**
 * Student Portal Operating System shell.
 * Parent portal must keep using legacy `PortalShell` (no Portal OS).
 * Optional `guidanceSections` activates the Guidance Platform chrome on path.
 */
export function StudentPortalShell({
  children,
  sections,
  guidanceSections = null,
  userDisplayName,
  organizationName,
  showAccountSwitcher = false,
}: StudentPortalShellProps) {
  return (
    <PortalTheme>
      <StudentPortalChrome
        sections={sections}
        guidanceSections={guidanceSections}
        userDisplayName={userDisplayName}
        organizationName={organizationName}
        showAccountSwitcher={showAccountSwitcher}
      >
        {children}
      </StudentPortalChrome>
    </PortalTheme>
  );
}
