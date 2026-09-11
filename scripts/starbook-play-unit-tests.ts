/**
 * Pure StarBook play-layer tests. No DB. No catalog.
 */

import assert from "node:assert/strict";
import {
  applyDailyVisit,
  emptyStarBookPlay,
  favoriteSubjects,
  grantPlay,
  noteSubject,
  playLevel,
  playTier,
  unlockBadge,
} from "../lib/commerce/starbook/play";

let passed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

check("playLevel grows every 100 XP", () => {
  assert.equal(playLevel(0).level, 1);
  assert.equal(playLevel(99).level, 1);
  assert.equal(playLevel(100).level, 2);
  assert.equal(playLevel(250).into, 50);
});

check("playTier maps stars to bronze/silver/gold", () => {
  assert.equal(playTier(10), "bronze");
  assert.equal(playTier(220), "silver");
  assert.equal(playTier(500), "gold");
});

check("applyDailyVisit increments streak across consecutive days", () => {
  const base = emptyStarBookPlay();
  base.lastVisitDay = "2026-09-10";
  base.streak = 2;
  const next = applyDailyVisit(base, "2026-09-11");
  assert.equal(next.streak, 3);
  assert.equal(next.lastVisitDay, "2026-09-11");
  assert.ok(next.badges.includes("streak3"));
});

check("applyDailyVisit is idempotent for the same day", () => {
  const base = emptyStarBookPlay();
  base.lastVisitDay = "2026-09-11";
  base.streak = 4;
  const next = applyDailyVisit(base, "2026-09-11");
  assert.equal(next.streak, 4);
  assert.equal(next.xp, base.xp);
});

check("grantPlay and noteSubject never invent catalog rows", () => {
  const next = noteSubject(grantPlay(emptyStarBookPlay(), { xp: 5, stars: 1 }), "ریاضی");
  assert.equal(next.xp, 45);
  assert.equal(next.subjects["ریاضی"], 1);
  assert.deepEqual(favoriteSubjects(next), [{ name: "ریاضی", count: 1 }]);
});

check("unlockBadge is unique", () => {
  const once = unlockBadge([], "firstWish");
  const twice = unlockBadge(once, "firstWish");
  assert.deepEqual(twice, ["firstWish"]);
});

console.log(`\n${passed} play tests passed`);
