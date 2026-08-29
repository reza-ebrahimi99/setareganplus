import type { Metadata } from "next";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import { StudentHomeScreen } from "@/components/portal/home/StudentHomeScreen";
import { buildGuidancePortalTimeline } from "@/lib/guidance/timeline";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { loadGuidancePlanForPortalUser } from "@/lib/guidance/portal";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import { loadStudentPortalDashboard } from "@/lib/portal/student/dashboard";
import { isSxpEnabled } from "@/lib/sxp/flags";

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

  const [dashboard, guidanceEnabled, sxpEnabled] = await Promise.all([
    loadStudentPortalDashboard(context, studentId),
    isGuidanceEnabled(context.organization.id),
    isSxpEnabled(context.organization.id),
  ]);

  let guidanceSteps = null;
  let hasGuidancePlan = false;

  if (guidanceEnabled) {
    const plan = await loadGuidancePlanForPortalUser({
      organizationId: context.organization.id,
      userId: context.user.id,
      studentId,
    });
    if (plan) {
      hasGuidancePlan = true;
      guidanceSteps = buildGuidancePortalTimeline(plan);
    }
  }

  return (
    <StudentHomeScreen
      dashboard={dashboard}
      guidanceEnabled={guidanceEnabled}
      sxpEnabled={sxpEnabled}
      guidanceSteps={guidanceSteps}
      hasGuidancePlan={hasGuidancePlan}
    />
  );
}
