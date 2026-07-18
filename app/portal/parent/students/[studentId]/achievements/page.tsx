import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalAchievementCard } from "@/components/portal/PortalAchievementCard";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import {
  isPortalError,
  persianPortalError,
  requireGuardianPortalAccess,
} from "@/lib/portal/auth";
import { loadPortalStudentAchievements } from "@/lib/portal/student/achievements";

type PageProps = { params: Promise<{ studentId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { studentId } = await params;
  const context = await requireGuardianPortalAccess();
  const student = context.authorizedStudents.find(
    (row) => row.studentId === studentId,
  );
  return {
    title: student ? `افتخارات ${student.studentName}` : "افتخارات",
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function ParentStudentAchievementsPage({
  params,
}: PageProps) {
  const { studentId } = await params;
  const context = await requireGuardianPortalAccess();
  const student = context.authorizedStudents.find(
    (row) => row.studentId === studentId,
  );
  if (!student) notFound();

  let achievements;
  try {
    achievements = await loadPortalStudentAchievements(context, studentId);
  } catch (error) {
    if (isPortalError(error)) {
      if (error.code === "STUDENT_ACCESS_DENIED") notFound();
      return (
        <PortalEmptyState
          title="دسترسی محدود"
          description={persianPortalError(error)}
        />
      );
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/portal/parent/students/${studentId}`}
          className="text-sm text-primary underline"
        >
          بازگشت به {student.studentName}
        </Link>
        <h1 className="mt-2 text-xl font-bold text-primary sm:text-2xl">
          افتخارات
        </h1>
        <p className="mt-1 text-sm text-muted">{student.studentName}</p>
      </div>
      {achievements.length === 0 ? (
        <PortalEmptyState
          title="افتخاری ثبت نشده"
          description="هنوز افتخار منتشرشده‌ای برای نمایش وجود ندارد."
        />
      ) : (
        <div className="space-y-3">
          {achievements.map((item) => (
            <PortalAchievementCard key={item.id} achievement={item} />
          ))}
        </div>
      )}
    </div>
  );
}
