import type { OfficeDashboardModel } from "@/lib/guidance/office/dashboard";
import { GuidanceStudentDashboardPanels } from "@/components/guidance/office/GuidanceStudentDashboardPanels";

export function OfficeHome({ model }: { model: OfficeDashboardModel }) {
  return <GuidanceStudentDashboardPanels model={model} />;
}
