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
    <div className="atelier" dir="rtl">
      <div className="atelier__glow" aria-hidden="true" />
      <div className="atelier__grain" aria-hidden="true" />
      <DepartmentRail pathname={pathname} sections={rail} />
      <div className="atelier-stage">
        <OfficeTopBar
          userDisplayName={userDisplayName}
          statusLabel={statusLabel}
        />
        <OfficeMobileNav pathname={pathname} sections={rail} />
        <div className="atelier-canvas">{children}</div>
      </div>
    </div>
  );
}
