import type { Metadata } from "next";
import { TrophyRoomScreen } from "@/components/portal/apps/TrophyRoomScreen";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import {
  loadStudentIntelligenceSnapshot,
  StudentInsightEngine,
} from "@/lib/portal/intelligence";

export const metadata: Metadata = {
  title: "اتاق افتخارات",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudentPortalAchievementsPage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.authorizedStudents[0]!.studentId;

  const snapshot = await loadStudentIntelligenceSnapshot(context, studentId, {
    includeAssessments: false,
    includeExperience: false,
  });

  if (snapshot.errors.achievements || snapshot.achievements == null) {
    return (
      <PortalEmptyState
        title="دسترسی محدود"
        description="امکان بارگذاری افتخارات برای این حساب وجود ندارد."
      />
    );
  }

  const model = StudentInsightEngine.achievements(snapshot);
  return (
    <TrophyRoomScreen
      achievements={model.achievements}
      insights={model.insights}
    />
  );
}
