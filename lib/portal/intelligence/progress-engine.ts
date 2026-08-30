/**
 * StudentProgressEngine — journey / profile / assessment progress view-models.
 */

import type { GuidanceTimelineStep } from "@/lib/guidance/timeline";
import type { PortalProgressSnapshot } from "@/lib/portal/intelligence/types";
import { StudentStatusEngine } from "@/lib/portal/intelligence/status-engine";
import type { PortalStudentProfileDto } from "@/lib/portal/student/profile";
import { buildPortalHomeProgress } from "@/lib/portal/student/home-presentation";

export const StudentProgressEngine = {
  fromGuidanceSteps(
    steps: readonly GuidanceTimelineStep[] | null,
  ): PortalProgressSnapshot | null {
    const base = buildPortalHomeProgress(steps);
    if (!base) return null;
    return {
      ...base,
      status: StudentStatusEngine.fromGuidanceSteps(steps),
    };
  },

  fromProfile(profile: PortalStudentProfileDto): PortalProgressSnapshot {
    const checks = [
      Boolean(profile.studentName),
      Boolean(profile.gradeName),
      Boolean(profile.schoolYear),
      Boolean(profile.portraitUrl),
    ];
    const completedSteps = checks.filter(Boolean).length;
    const totalSteps = checks.length;
    const percent = Math.round((completedSteps / totalSteps) * 100);
    return {
      completedSteps,
      totalSteps,
      remainingSteps: totalSteps - completedSteps,
      percent,
      phaseLabel: "تکمیل هویت تحصیلی",
      status: StudentStatusEngine.fromProfile(profile),
    };
  },
} as const;
