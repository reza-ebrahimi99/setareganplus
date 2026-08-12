"use client";

import { useEffect, useState } from "react";
import {
  loadAtrinProfile,
  rememberFavoriteMode,
  rememberGrade,
  rememberPrompt,
  touchAtrinVisit,
  type AtrinProfile,
} from "@/lib/atrin/profile";
import type { AtrinModeId } from "@/content/atrin";

export function useAtrinProfile(modeId?: AtrinModeId) {
  const [profile, setProfile] = useState<AtrinProfile>(() => ({
    name: null,
    grade: null,
    favoriteMode: null,
    recentPrompts: [],
    lastVisit: null,
    visitCount: 0,
    firstChatCelebrated: false,
  }));

  useEffect(() => {
    setProfile(touchAtrinVisit());
  }, []);

  useEffect(() => {
    if (!modeId || modeId === "general") return;
    rememberFavoriteMode(modeId);
    setProfile(loadAtrinProfile());
  }, [modeId]);

  function trackPrompt(text: string) {
    rememberPrompt(text);
    const grade = text.match(
      /(?:کلاس|پایه)\s*(اول|دوم|سوم|چهارم|پنجم|ششم|هفتم|هشتم|نهم|دهم|یازدهم|دوازدهم|\d{1,2})/,
    );
    if (grade?.[1]) rememberGrade(`پایه ${grade[1]}`);
    setProfile(loadAtrinProfile());
  }

  function refresh() {
    setProfile(loadAtrinProfile());
  }

  return { profile, trackPrompt, refresh };
}
