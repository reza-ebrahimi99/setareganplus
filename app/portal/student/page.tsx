import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import { StudentHomeScreen } from "@/components/portal/home/StudentHomeScreen";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { resolveGuidanceStudentHomePath } from "@/lib/guidance/student-entry";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import {
  loadStudentIntelligenceSnapshot,
  PortalDashboardEngine,
} from "@/lib/portal/intelligence";

export const metadata: Metadata = {
  title: "خانه | پرتال دانش‌آموز",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudentPortalHomePage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.authorizedStudents[0]?.studentId;
  if (!studentId) {
    return (
      <PortalEmptyState
        title="دسترسی فعال نیست"
        description="حساب دانش‌آموزی برای شما تعریف نشده است. لطفاً با مدرسه تماس بگیرید."
      />
    );
  }

  const guidanceOn = await isGuidanceEnabled(context.organization.id);
  if (guidanceOn) {
    const host = (await headers()).get("host");
    const guidanceHome = await resolveGuidanceStudentHomePath(context, { host });
    if (guidanceHome !== "/portal/student") {
      redirect(guidanceHome);
    }
  }

  const snapshot = await loadStudentIntelligenceSnapshot(context, studentId);
  const model = PortalDashboardEngine.buildHome(snapshot);

  return <StudentHomeScreen model={model} />;
}
