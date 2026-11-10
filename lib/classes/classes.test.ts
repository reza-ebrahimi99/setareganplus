import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { acceptWatchDelta, chargeRials, coursePrice, courseShowsPremium, devOtpAllowed, lessonFraction, parseAparatHash, presentPrice, publicName, quizPoints, safeNext, tehranWeekStart, PREMIUM_LIST_PRICE_RIALS, SEED_LIST_PRICE_RIALS } from "./catalog";
import { parseCsv } from "./csv";
import { buildCatalog, toRaw } from "./map";
import { renderMath } from "./math";
import { parseQbank } from "./qbank";
import { visualRtl } from "./shape";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (name: string) => parseCsv(readFileSync(path.join(root, "prisma/class-seed", name), "utf8"));

test("catalog maps all 123 videos into topic courses and grade leftovers", () => {
  const plan = read("plan.csv").map(toRaw);
  const plan2 = read("plan2.csv").map(toRaw);
  const regroup = read("regroup.csv").map((r) => ({ hash: r.hash, target: r.target_playlist }));
  const inventory = read("inventory.csv").map((r) => ({ hash: r.hash, duration: r.duration }));
  const courses = buildCatalog(plan, plan2, regroup, inventory);
  const lessons = courses.flatMap((c) => c.lessons);
  assert.equal(lessons.length, 123);
  assert.equal(new Set(lessons.map((l) => l.aparatHash)).size, 123);
  const topics = courses.filter((c) => c.kind === "TOPIC");
  assert.equal(topics.length, 10);
  const by = (slug: string) => courses.find((c) => c.slug === slug)!;
  assert.ok(by("moshtagh").lessons.some((l) => l.aparatHash === "gvz8j6s"));
  assert.ok(by("tabe").lessons.some((l) => l.aparatHash === "fwczfx1"));
  assert.ok(by("tabe").lessons.some((l) => l.aparatHash === "y94u6br"));
  assert.equal(by("mohasebat").lessons.length, 5);
  assert.ok(by("mohasebat").fields.includes("ensani"));
  assert.ok(by("shimi-11"));
  assert.deepEqual(by("shimi-11").grades, ["g11"]);
  assert.ok(by("shimi-11").fields.includes("riazi") && !by("shimi-11").fields.includes("ensani"));
  const ensani = courses.find((c) => c.slug === "riazi-10-ensani");
  assert.ok(ensani);
  assert.deepEqual(ensani!.fields, ["ensani"]);
  const sample = lessons.find((l) => l.aparatHash === "wcdf36j");
  assert.equal(sample?.durationSec, 22 * 60 + 17);
  assert.ok(courses.every((c) => c.isFree && c.priceRials > 0));
  assert.ok(!lessons.some((l) => l.description.includes("https://")));
});

test("price, access math, heartbeat and privacy helpers", () => {
  assert.deepEqual(coursePrice({ isFree: true, priceRials: 2500000, salePriceRials: null }), { kind: "free", list: 2500000 });
  assert.equal(chargeRials({ isFree: true, priceRials: 2500000, salePriceRials: 1000 }), 0);
  const sale = coursePrice({ isFree: false, priceRials: 1000, salePriceRials: 700 });
  assert.equal(sale.kind, "sale");
  assert.equal(chargeRials({ isFree: false, priceRials: 1000, salePriceRials: 700 }), 700);
  assert.equal(devOtpAllowed("production"), false);
  assert.equal(devOtpAllowed("development"), true);
  assert.equal(parseAparatHash("https://www.aparat.com/v/gvz8j6s"), "gvz8j6s");
  assert.equal(parseAparatHash("https://www.aparat.com/video/video/embed/videohash/wFdSD/vt/frame"), "wFdSD");
  assert.equal(parseAparatHash("javascript:alert(1)"), null);
  assert.equal(safeNext("https://evil.example"), "/classes");
  assert.equal(safeNext("/classes/tabe"), "/classes/tabe");
  const beat = acceptWatchDelta({ deltaSec: 40, elapsedSec: 15, watchedSec: 100, durationSec: 120 });
  assert.equal(beat.add, 17);
  assert.equal(beat.seconds, 117);
  assert.equal(beat.completed, true);
  const capped = acceptWatchDelta({ deltaSec: 20, elapsedSec: 1, watchedSec: 10, durationSec: null });
  assert.equal(capped.add, 3);
  assert.equal(lessonFraction({ watchedSec: 90, durationSec: 100, completed: false, quizScore: 4, quizTotal: 4, hasQuiz: true }), 0.7 * 0.9 + 0.3);
  assert.equal(quizPoints(4, 4), 55);
  assert.equal(publicName("رضا", "ابراهیمی"), "رضا ا.");
  assert.equal(tehranWeekStart(new Date("2026-11-10T12:00:00+03:30")), "2026-11-07");
  assert.equal(courseShowsPremium({ isPremium: false }, [{ isPremium: true }]), true);
  assert.equal(courseShowsPremium({ isPremium: true }, []), true);
  assert.equal(courseShowsPremium({}, [{ isPremium: false }]), false);
  assert.equal(presentPrice({ isFree: true, priceRials: SEED_LIST_PRICE_RIALS }, true).priceRials, PREMIUM_LIST_PRICE_RIALS);
  assert.equal(presentPrice({ isFree: true, priceRials: 1230 }, true).priceRials, 1230);
  assert.equal(chargeRials(presentPrice({ isFree: true, priceRials: SEED_LIST_PRICE_RIALS, salePriceRials: null }, true)), 0);
});

test("qbank json and math escaping", () => {
  const parsed = parseQbank({
    source: "qbank",
    questions: [{ externalId: "qb-1", lessonHash: "gvz8j6s", prompt: "اگر $x^2$ باشد", choices: [{ text: "۴", correct: true }, { text: "۵", correct: false }] }],
  });
  assert.equal(parsed.ok, true);
  const bad = parseQbank({ questions: [{ externalId: "x", lessonHash: "gvz8j6s", prompt: "؟", choices: [{ text: "آ", correct: true }, { text: "ب", correct: true }] }] });
  assert.equal(bad.ok, false);
  const html = renderMath("سلام <script>alert(1)</script> $x$");
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("katex"));
  const shaped = visualRtl("سلام");
  assert.notEqual(shaped, "سلام");
  assert.ok(shaped.length >= 4);
});
