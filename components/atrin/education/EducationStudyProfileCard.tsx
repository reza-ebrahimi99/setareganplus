"use client";

import { useEffect, useState } from "react";
import { AtrinCard } from "@/components/atrin/ui";
import {
  loadStudyProfile,
  type StudyProfile,
} from "@/lib/atrin/education";

const SUBJECT_FA: Record<string, string> = {
  math: "ریاضی",
  physics: "فیزیک",
  chemistry: "شیمی",
  biology: "زیست",
  english: "انگلیسی",
  persian: "فارسی",
  arabic: "عربی",
  geometry: "هندسه",
  programming: "برنامه‌نویسی",
  gifted: "تیزهوشان",
  konkur: "کنکور",
};

/**
 * Lightweight local study profile visualization (client-only).
 */
export function EducationStudyProfileCard({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const [profile, setProfile] = useState<StudyProfile | null>(null);

  useEffect(() => {
    setProfile(loadStudyProfile());
  }, [refreshKey]);

  if (
    !profile ||
    (!profile.preferredGrade &&
      !profile.favoriteSubject &&
      profile.recentLessons.length === 0)
  ) {
    return null;
  }

  return (
    <div aria-label="پروفایل مطالعه">
      <AtrinCard className="!p-3" hover={false}>
        <p className="text-xs font-bold text-white">پروفایل مطالعه (محلی)</p>
        <ul className="mt-2 space-y-1 text-xs text-slate-300">
          {profile.preferredGrade ? (
            <li>پایه: {profile.preferredGrade}</li>
          ) : null}
          {profile.preferredSubject || profile.favoriteSubject ? (
            <li>
              علاقه:{" "}
              {SUBJECT_FA[
                profile.preferredSubject ?? profile.favoriteSubject ?? ""
              ] ??
                profile.preferredSubject ??
                profile.favoriteSubject}
            </li>
          ) : null}
          {profile.weakness ? <li>نقطه ضعف: {profile.weakness}</li> : null}
          {profile.weakTopics[0] ? (
            <li>موضوعات ضعیف: {profile.weakTopics.slice(0, 3).join("، ")}</li>
          ) : null}
          {profile.strongTopics[0] ? (
            <li>نقاط قوت: {profile.strongTopics.slice(0, 3).join("، ")}</li>
          ) : null}
          {profile.completedLessons.length ? (
            <li>درس‌های تکمیل‌شده: {profile.completedLessons.length}</li>
          ) : null}
          {profile.recentExercises[0] ? (
            <li>آخرین تمرین: {profile.recentExercises[0]}</li>
          ) : null}
          {profile.preferredStyle ? (
            <li>سبک: {profile.preferredStyle}</li>
          ) : null}
        </ul>
      </AtrinCard>
    </div>
  );
}
