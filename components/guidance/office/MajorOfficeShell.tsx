import { DepartmentRail } from "@/components/guidance/office/DepartmentRail";
import { OfficeTopBar } from "@/components/guidance/office/OfficeTopBar";
import { chamberRoomKey } from "@/lib/guidance/office/chrome";
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
    <div className="chamber" data-room={chamberRoomKey(pathname)} dir="rtl">
      <OfficeTopBar
        userDisplayName={userDisplayName}
        statusLabel={statusLabel}
      />
      <DepartmentRail pathname={pathname} sections={rail} />
      <main className="chamber-body">{children}</main>
    </div>
  );
}
