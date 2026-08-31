import { PortalTheme } from "@/components/portal/theme/PortalTheme";
import { DepartmentRail } from "@/components/guidance/office/DepartmentRail";
import { OfficeMobileNav } from "@/components/guidance/office/OfficeMobileNav";
import { OfficeTopBar } from "@/components/guidance/office/OfficeTopBar";
import type { OfficeRailSection } from "@/lib/guidance/office/nav";

export function MajorOfficeShell({
  children,
  userDisplayName,
  statusLabel,
  pathname,
  rail,
}: {
  children: React.ReactNode;
  userDisplayName: string;
  statusLabel: string;
  pathname: string;
  rail: readonly OfficeRailSection[];
}) {
  return (
    <PortalTheme className="major-office-root">
      <div className="major-office" dir="rtl" data-portal-accent="purple">
        <DepartmentRail pathname={pathname} sections={rail} />
        <div className="major-office__main">
          <OfficeTopBar
            userDisplayName={userDisplayName}
            statusLabel={statusLabel}
          />
          <OfficeMobileNav pathname={pathname} sections={rail} />
          <div className="major-office__body">{children}</div>
        </div>
      </div>
    </PortalTheme>
  );
}
