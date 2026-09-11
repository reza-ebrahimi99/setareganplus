"use client";

import {
  STARBOOK_PLAY_KEY,
  applyDailyVisit,
  emptyStarBookPlay,
  grantPlay,
  noteSubject,
  unlockBadge,
  type StarBookPlayState,
} from "@/lib/commerce/starbook/play";

function readRaw(): StarBookPlayState {
  if (typeof window === "undefined") return emptyStarBookPlay();
  try {
    const raw = window.localStorage.getItem(STARBOOK_PLAY_KEY);
    if (!raw) return emptyStarBookPlay();
    return { ...emptyStarBookPlay(), ...(JSON.parse(raw) as StarBookPlayState) };
  } catch {
    return emptyStarBookPlay();
  }
}

function writeRaw(state: StarBookPlayState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STARBOOK_PLAY_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("starbook-store"));
}

export function readStarBookPlay(): StarBookPlayState {
  return applyDailyVisit(readRaw());
}

export function syncStarBookPlayVisit() {
  const next = applyDailyVisit(readRaw());
  writeRaw(next);
  return next;
}

export function awardStarBookPlay(
  reward: { xp?: number; stars?: number; badge?: string; subject?: string | null },
) {
  let next = grantPlay(readStarBookPlay(), reward);
  if (reward.badge) next.badges = unlockBadge(next.badges, reward.badge);
  if (reward.subject) next = noteSubject(next, reward.subject);
  writeRaw(next);
  return next;
}

export function bumpStarBookMission() {
  const current = readStarBookPlay();
  const next = {
    ...current,
    missionProgress: Math.min(3, current.missionProgress + 1),
  };
  if (next.missionProgress >= 3) {
    next.badges = unlockBadge(next.badges, "firstWish");
    next.xp += 20;
    next.stars += 8;
  }
  writeRaw(next);
  return next;
}
