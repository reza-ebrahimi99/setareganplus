import { PortalTheme } from "@/components/portal/theme/PortalTheme";
import { DepartmentRail } from "@/components/guidance/office/DepartmentRail";
import { OfficeTopBar } from "@/components/guidance/office/OfficeTopBar";

export function MajorOfficeShell({
  children,
  userDisplayName,
  statusLabel,
  pathname,
}: {
  children: React.ReactNode;
  userDisplayName: string;
  statusLabel: string;
  pathname: string;
}) {
  return (
    <PortalTheme className="major-office-root">
      <div className="major-office" dir="rtl" data-portal-accent="purple">
        <DepartmentRail pathname={pathname} />
        <div className="major-office__main">
          <OfficeTopBar
            userDisplayName={userDisplayName}
            statusLabel={statusLabel}
          />
          <div className="major-office__body">{children}</div>
        </div>
      </div>
    </PortalTheme>
  );
}
