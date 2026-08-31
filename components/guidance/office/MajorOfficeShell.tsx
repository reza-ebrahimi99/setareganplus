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
    <div className="chamber" dir="rtl">
      <div className="chamber-wash" aria-hidden="true" />
      <div className="chamber-dust" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <DepartmentRail pathname={pathname} sections={rail} />
      <div className="chamber-stage">
        <OfficeTopBar userDisplayName={userDisplayName} statusLabel={statusLabel} />
        <OfficeMobileNav pathname={pathname} sections={rail} />
        <div className="chamber-body">{children}</div>
      </div>
    </div>
  );
}
