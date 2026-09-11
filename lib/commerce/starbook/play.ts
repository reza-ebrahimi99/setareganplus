/**
 * StarBook play layer — XP, streaks, badges. Local only.
 * Never a catalog. Never a Prisma table.
 */

export type StarBookPlayTier = "bronze" | "silver" | "gold";

export type StarBookPlayState = {
  xp: number;
  stars: number;
  streak: number;
  lastVisitDay: string;
  badges: string[];
  missionProgress: number;
  subjects: Record<string, number>;
};

export const STARBOOK_PLAY_KEY = "starbook.play.v1";

export const STARBOOK_BADGES: Record<string, { title: string; hint: string }> = {
  firstWish: { title: "قلب اول", hint: "اولین کتاب را ذخیره کردی" },
  firstCart: { title: "سبد زنده", hint: "اولین کتاب رفت توی سبد" },
  explorer: { title: "کاشف قفسه", hint: "۵ جستجوی متفاوت" },
  streak3: { title: "۳ روز پیاپی", hint: "سه روز سر زدی" },
  streak7: { title: "هفته آتشین", hint: "هفت روز پشت‌سرهم" },
  rater: { title: "داور کلاس", hint: "به یک کتاب ستاره دادی" },
};

export const STARBOOK_MISSION = {
  id: "wish-3",
  title: "ماموریت هفته",
  hint: "۳ کتاب را به علاقه‌مندی اضافه کن",
  goal: 3,
} as const;

export function emptyStarBookPlay(): StarBookPlayState {
  return {
    xp: 40,
    stars: 120,
    streak: 1,
    lastVisitDay: "",
    badges: [],
    missionProgress: 0,
    subjects: {},
  };
}

export function playLevel(xp: number) {
  const safe = Math.max(0, Math.floor(xp));
  const level = Math.floor(safe / 100) + 1;
  const into = safe % 100;
  return { level, into, nextAt: 100, ratio: into / 100 };
}

export function playTier(stars: number): StarBookPlayTier {
  if (stars >= 500) return "gold";
  if (stars >= 220) return "silver";
  return "bronze";
}

export function playTierLabel(tier: StarBookPlayTier) {
  if (tier === "gold") return "طلایی";
  if (tier === "silver") return "نقره‌ای";
  return "برنزی";
}

export function todayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function applyDailyVisit(
  state: StarBookPlayState,
  today = todayKey(),
): StarBookPlayState {
  if (state.lastVisitDay === today) return state;
  const yesterday = new Date(`${today}T12:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  const streak = state.lastVisitDay === yesterdayKey ? state.streak + 1 : 1;
  const next = grantPlay(state, { xp: 8, stars: 2 });
  next.streak = streak;
  next.lastVisitDay = today;
  if (streak >= 3) next.badges = unlockBadge(next.badges, "streak3");
  if (streak >= 7) next.badges = unlockBadge(next.badges, "streak7");
  return next;
}

export function grantPlay(
  state: StarBookPlayState,
  reward: { xp?: number; stars?: number },
): StarBookPlayState {
  return {
    ...state,
    subjects: { ...state.subjects },
    badges: [...state.badges],
    xp: state.xp + (reward.xp ?? 0),
    stars: state.stars + (reward.stars ?? 0),
  };
}

export function unlockBadge(badges: readonly string[], id: string) {
  if (badges.includes(id)) return [...badges];
  return [...badges, id];
}

export function noteSubject(state: StarBookPlayState, subject: string | null) {
  const key = subject?.trim();
  if (!key) return state;
  return {
    ...state,
    subjects: {
      ...state.subjects,
      [key]: (state.subjects[key] ?? 0) + 1,
    },
  };
}

export function favoriteSubjects(state: StarBookPlayState, limit = 4) {
  return Object.entries(state.subjects)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}
