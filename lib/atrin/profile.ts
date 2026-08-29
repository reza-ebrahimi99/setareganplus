import type { AtrinModeId } from "@/content/atrin-os";

export type AtrinProfile = {
  name: string | null;
  grade: string | null;
  favoriteMode: AtrinModeId | null;
  recentPrompts: string[];
  lastVisit: number | null;
  visitCount: number;
  firstChatCelebrated: boolean;
};

const PROFILE_KEY = "atrin-profile-v1";

const EMPTY: AtrinProfile = {
  name: null,
  grade: null,
  favoriteMode: null,
  recentPrompts: [],
  lastVisit: null,
  visitCount: 0,
  firstChatCelebrated: false,
};

export function loadAtrinProfile(): AtrinProfile {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<AtrinProfile>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : null,
      grade: typeof parsed.grade === "string" ? parsed.grade : null,
      favoriteMode:
        typeof parsed.favoriteMode === "string"
          ? (parsed.favoriteMode as AtrinModeId)
          : null,
      recentPrompts: Array.isArray(parsed.recentPrompts)
        ? parsed.recentPrompts.filter((x): x is string => typeof x === "string").slice(0, 8)
        : [],
      lastVisit: typeof parsed.lastVisit === "number" ? parsed.lastVisit : null,
      visitCount: typeof parsed.visitCount === "number" ? parsed.visitCount : 0,
      firstChatCelebrated: Boolean(parsed.firstChatCelebrated),
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveAtrinProfile(profile: AtrinProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function touchAtrinVisit(): AtrinProfile {
  const current = loadAtrinProfile();
  const next: AtrinProfile = {
    ...current,
    lastVisit: Date.now(),
    visitCount: current.visitCount + 1,
  };
  saveAtrinProfile(next);
  return next;
}

export function rememberPrompt(prompt: string): void {
  const current = loadAtrinProfile();
  const recentPrompts = [
    prompt,
    ...current.recentPrompts.filter((item) => item !== prompt),
  ].slice(0, 8);
  saveAtrinProfile({ ...current, recentPrompts });
}

export function rememberFavoriteMode(mode: AtrinModeId): void {
  const current = loadAtrinProfile();
  saveAtrinProfile({ ...current, favoriteMode: mode });
}

export function rememberGrade(grade: string): void {
  const current = loadAtrinProfile();
  saveAtrinProfile({ ...current, grade });
}

export function markFirstChatCelebrated(): void {
  const current = loadAtrinProfile();
  saveAtrinProfile({ ...current, firstChatCelebrated: true });
}

export function daysSinceLastVisit(profile: AtrinProfile): number | null {
  if (!profile.lastVisit) return null;
  return Math.floor((Date.now() - profile.lastVisit) / (1000 * 60 * 60 * 24));
}
