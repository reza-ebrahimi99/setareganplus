import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalSource,
  clampRange,
  cookieMaxAgeSec,
  ipLimitKey,
  isBot,
  isInternalHost,
  isPrefetch,
  normalizePublicPath,
  readAttribution,
  resolveAttribution,
  safeReferralLabel,
  shiftTehranDay,
  signAttribution,
  sourceFromReferrer,
  tehranDay,
  tehranDayStart,
  validVisitorId,
  visitorKey,
  seenTooSoon,
} from "./classify";

const SECRET = "test-secret-test-secret-test-secret";

test("public paths drop queries and reject private routes", () => {
  assert.equal(normalizePublicPath("/news/foo?utm_source=sms&phone=09123456789"), "/news/foo");
  assert.equal(normalizePublicPath("/test-motalee?ref=ABC&token=secret"), "/test-motalee");
  assert.equal(normalizePublicPath("/news/سلام-دنیا"), "/news/سلام-دنیا");
  assert.equal(normalizePublicPath("/"), "/");
  assert.equal(normalizePublicPath("/admin"), null);
  assert.equal(normalizePublicPath("/admin/analytics"), null);
  assert.equal(normalizePublicPath("/booklet/secret-token"), null);
  assert.equal(normalizePublicPath("/order/12345"), null);
  assert.equal(normalizePublicPath("/o/ABCD"), null);
  assert.equal(normalizePublicPath("/shop/pay/callback"), null);
  assert.equal(normalizePublicPath("/f/r/token"), null);
  assert.equal(normalizePublicPath("/../admin"), null);
  assert.equal(normalizePublicPath("https://evil.example/news"), null);
  const stored = normalizePublicPath("/news/x?mobile=09120000000");
  assert.ok(stored && !stored.includes("0912") && !stored.includes("mobile"));
});

test("utm source wins, then the day's first touch, then the referrer", () => {
  const day = "2026-11-06";
  const sms = resolveAttribution({
    utmSource: "SMS",
    utmMedium: "sms",
    utmCampaign: "Aban 1404",
    referrer: "https://www.google.com/search?q=setaregan",
    existing: null,
    day,
  });
  assert.deepEqual(sms, { s: "sms", m: "sms", c: "aban_1404", d: day });

  const kept = resolveAttribution({
    referrer: "https://setareganplus.ir/news/x",
    requestHost: "setareganplus.ir",
    existing: sms,
    day,
  });
  assert.equal(kept.s, "sms");

  const replaced = resolveAttribution({
    utmSource: "bale",
    utmMedium: "social",
    utmCampaign: "quiz",
    existing: sms,
    day,
  });
  assert.equal(replaced.s, "bale");
  assert.equal(replaced.c, "quiz");

  const google = resolveAttribution({
    referrer: "https://www.google.com/search?q=کنکور",
    requestHost: "setareganplus.ir",
    existing: null,
    day,
  });
  assert.equal(google.s, "google");
  assert.equal(google.m, "referral");

  const direct = resolveAttribution({ referrer: "", existing: null, day });
  assert.equal(direct.s, "direct");

  const fromAction = resolveAttribution({
    referrer: "https://setareganplus.ir/test-motalee?utm_source=sms&utm_medium=sms&utm_campaign=aban1404",
    requestHost: "www.setareganplus.ir",
    existing: null,
    day,
  });
  assert.deepEqual(fromAction, { s: "sms", m: "sms", c: "aban1404", d: day });
});

test("referrer hosts map to a source and same-site referrers do not", () => {
  assert.equal(sourceFromReferrer("https://web.bale.ai/chat", "setareganplus.ir"), "bale");
  assert.equal(sourceFromReferrer("https://ble.ir/x", "setareganplus.ir"), "bale");
  assert.equal(sourceFromReferrer("android-app://com.google.android.googlequicksearchbox", "setareganplus.ir"), "google");
  assert.equal(sourceFromReferrer("https://www.google.co.uk/search?q=1", "setareganplus.ir"), "google");
  assert.equal(sourceFromReferrer("https://l.instagram.com/", "setareganplus.ir"), "instagram");
  assert.equal(sourceFromReferrer("https://setareganplus.ir/news/a", "setareganplus.ir"), null);
  assert.equal(sourceFromReferrer("https://www.setareganplus.ir/", "setareganplus.ir"), null);
  assert.equal(isInternalHost("localhost:3000", ""), true);
  assert.equal(canonicalSource("پیامک"), "sms");
  assert.equal(canonicalSource("بله"), "bale");
});

test("visitor key rotates daily and is not the raw id or the IP", () => {
  const vid = "abcdefghijABCDEFG_-12";
  assert.equal(validVisitorId(vid), vid);
  const a = visitorKey(SECRET, "2026-11-06", vid);
  const b = visitorKey(SECRET, "2026-11-07", vid);
  assert.notEqual(a, b);
  assert.equal(a, visitorKey(SECRET, "2026-11-06", vid));
  assert.equal(a.includes(vid), false);
  const ipKey = ipLimitKey(SECRET, "2026-11-06", "203.0.113.10");
  assert.equal(ipKey.includes("203.0.113.10"), false);
  assert.notEqual(ipKey, ipLimitKey(SECRET, "2026-11-07", "203.0.113.10"));
});

test("attribution cookie is signed and rejects tampering", () => {
  const raw = signAttribution(SECRET, { s: "sms", m: "sms", c: "aban", d: "2026-11-06" });
  assert.deepEqual(readAttribution(SECRET, raw), { s: "sms", m: "sms", c: "aban", d: "2026-11-06" });
  assert.equal(readAttribution("another-secret-another-secret-xxx", raw), null);
  assert.equal(readAttribution(SECRET, raw.slice(0, -3) + "xxx"), null);
  assert.equal(readAttribution(SECRET, null), null);
});

test("tehran day boundary and range clamp", () => {
  const start = tehranDayStart("2026-11-06");
  assert.equal(tehranDay(start), "2026-11-06");
  assert.equal(tehranDay(new Date(start.getTime() - 1)), "2026-11-05");
  assert.equal(shiftTehranDay("2026-11-06", -1), "2026-11-05");
  assert.equal(shiftTehranDay("2026-11-06", 1), "2026-11-07");
  assert.ok(cookieMaxAgeSec(start) <= 86400);
  const clamped = clampRange("2020-01-01", "2026-11-06", 10);
  assert.equal(clamped.to, "2026-11-06");
  assert.equal(clamped.from, shiftTehranDay("2026-11-06", -9));
});

test("bots, prefetch, referral redaction, and view dedupe", () => {
  assert.equal(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"), true);
  assert.equal(isBot("curl/8.0.1"), true);
  assert.equal(isBot(""), true);
  assert.equal(isBot("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36"), false);
  assert.equal(isPrefetch({ get: (n) => (n === "purpose" ? "prefetch" : null) }), true);
  assert.equal(isPrefetch({ get: () => null }), false);
  assert.equal(safeReferralLabel("ST-12AB"), "ST-12AB");
  assert.equal(safeReferralLabel("09123456789"), null);
  assert.equal(safeReferralLabel("user@example.com"), null);
  const map = new Map<string, number>();
  assert.equal(seenTooSoon(map, "v|/news", 1_000, 15_000), false);
  assert.equal(seenTooSoon(map, "v|/news", 2_000, 15_000), true);
  assert.equal(seenTooSoon(map, "v|/news", 20_000, 15_000), false);
});
