import type { Metadata } from "next";
import { TrophyRoomScreen } from "@/components/portal/apps/TrophyRoomScreen";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import {
  isPortalError,
  persianPortalError,
  requireStudentPortalAccess,
} from "@/lib/portal/auth";
import { loadPortalStudentAchievements } from "@/lib/portal/student/achievements";
import { buildTrophyRoomInsights } from "@/lib/portal/student/trophy-insights";

export const metadata: Metadata = {
  title: "اتاق افتخارات",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudentPortalAchievementsPage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.authorizedStudents[0]!.studentId;

  let achievements;
  try {
    achievements = await loadPortalStudentAchievements(context, studentId);
  } catch (error) {
    if (isPortalError(error)) {
      return (
        <PortalEmptyState
          title="دسترسی محدود"
          description={persianPortalError(error)}
        />
      );
    }
    throw error;
  }

  const insights = buildTrophyRoomInsights(achievements);
  return (
    <TrophyRoomScreen achievements={achievements} insights={insights} />
  );
}
