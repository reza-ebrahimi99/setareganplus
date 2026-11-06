import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { normalizePublicPath } from "./path";

export { normalizePublicPath };

/** Raw events kept this many Tehran days, then folded into daily totals. */
export const RAW_RETENTION_DAYS = 120;
/** Daily totals kept this many Tehran days (~26 months), then deleted. */
export const DAILY_RETENTION_DAYS = 800;

export const VID_COOKIE = "sp_vid";
export const SRC_COOKIE = "sp_src";

export const SOURCE_LABEL: Record<string, string> = {
  direct: "ورود مستقیم",
  google: "گوگل",
  sms: "پیامک",
  bale: "بله",
  instagram: "اینستاگرام",
  telegram: "تلگرام",
  eitaa: "ایتا",
  rubika: "روبیکا",
  bing: "بینگ",
  yahoo: "یاهو",
  duckduckgo: "داک‌داک‌گو",
  other: "سایر",
};

const SOURCE_ALIAS: Record<string, string> = {
  sms: "sms",
  message: "sms",
  payam: "sms",
  payamak: "sms",
  پیامک: "sms",
  bale: "bale",
  ble: "bale",
  بله: "bale",
  google: "google",
  googleads: "google",
  adwords: "google",
  gads: "google",
  instagram: "instagram",
  ig: "instagram",
  insta: "instagram",
  telegram: "telegram",
  tg: "telegram",
  eitaa: "eitaa",
  rubika: "rubika",
  direct: "direct",
  none: "direct",
  bing: "bing",
  yahoo: "yahoo",
  duckduckgo: "duckduckgo",
};

export function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] || source;
}

export type Attribution = { s: string; m: string; c: string; d: string };

/** Asia/Tehran calendar day as YYYY-MM-DD. Iran has no DST; midnight is UTC+03:30. */
export function tehranDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** UTC instant of 00:00 Asia/Tehran on the given Gregorian day. */
export function tehranDayStart(day: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) throw new Error("bad day");
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0) - (3 * 60 + 30) * 60 * 1000);
}

export function shiftTehranDay(day: string, delta: number): string {
  const midday = tehranDayStart(day).getTime() + (12 + delta * 24) * 3_600_000;
  return tehranDay(new Date(midday));
}

export function cookieMaxAgeSec(now = new Date()): number {
  const start = tehranDayStart(tehranDay(now));
  const next = start.getTime() + 24 * 3_600_000;
  return Math.max(60, Math.ceil((next - now.getTime()) / 1000));
}

export function eachTehranDay(from: string, to: string): string[] {
  const out: string[] = [];
  let day = from <= to ? from : to;
  const end = from <= to ? to : from;
  for (let i = 0; i < 400 && day <= end; i++) {
    out.push(day);
    day = shiftTehranDay(day, 1);
  }
  return out;
}

export function clampRange(from: string, to: string, maxDays = 400): { from: string; to: string } {
  let a = from <= to ? from : to;
  let b = from <= to ? to : from;
  const minFrom = shiftTehranDay(b, -(maxDays - 1));
  if (a < minFrom) a = minFrom;
  return { from: a, to: b };
}

export function sanitizeToken(raw: string | null | undefined, max: number): string {
  if (!raw) return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]+/gu, "")
    .slice(0, max);
}

export function canonicalSource(raw: string | null | undefined): string {
  const token = sanitizeToken(raw, 32);
  if (!token) return "";
  return SOURCE_ALIAS[token] || token;
}

export function utmFromUrl(referrer: string | null | undefined): { source: string; medium: string; campaign: string } {
  if (!referrer) return { source: "", medium: "", campaign: "" };
  try {
    const u = new URL(referrer);
    return {
      source: u.searchParams.get("utm_source") ?? "",
      medium: u.searchParams.get("utm_medium") ?? "",
      campaign: u.searchParams.get("utm_campaign") ?? "",
    };
  } catch {
    return { source: "", medium: "", campaign: "" };
  }
}

function hostOf(ref: string): string | null {
  const trimmed = ref.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("android-app://")) {
    return trimmed.slice("android-app://".length).split("/")[0]?.toLowerCase() || null;
  }
  try {
    return new URL(trimmed).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

export function isInternalHost(host: string, requestHost = ""): boolean {
  const norm = (h: string) => h.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "").replace(/^www\./, "");
  const h = norm(host);
  if (!h) return false;
  if (h === "setareganplus.ir" || h.endsWith(".setareganplus.ir") || h === "localhost" || h === "127.0.0.1") return true;
  const req = requestHost ? norm(requestHost) : "";
  return !!req && h === req;
}

/** Classified referrer, or null when missing / same-site (so it does not wipe a campaign). */
export function sourceFromReferrer(referrer: string | null | undefined, requestHost = ""): string | null {
  if (!referrer) return null;
  const host = hostOf(referrer);
  if (!host || isInternalHost(host, requestHost)) return null;
  if (
    host === "g.co" ||
    host.endsWith(".g.co") ||
    host === "goo.gl" ||
    host.includes("googlequicksearchbox") ||
    /(^|\.)google\.(com|[a-z]{2})$/.test(host) ||
    /(^|\.)google\.com\.[a-z]{2}$/.test(host) ||
    /(^|\.)google\.co\.[a-z]{2}$/.test(host)
  ) {
    return "google";
  }
  if (host === "bale.ai" || host.endsWith(".bale.ai") || host === "ble.ir" || host.endsWith(".ble.ir")) return "bale";
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
  if (host === "t.me" || host.endsWith(".t.me") || host.endsWith("telegram.org") || host.endsWith("telegram.me")) return "telegram";
  if (host.endsWith("eitaa.com") || host.endsWith("eitaa.ir")) return "eitaa";
  if (host.endsWith("rubika.ir")) return "rubika";
  if (host === "bing.com" || host.endsWith(".bing.com")) return "bing";
  if (host.includes("yahoo.")) return "yahoo";
  if (host.endsWith("duckduckgo.com")) return "duckduckgo";
  return "other";
}

/**
 * First touch for the Tehran day, unless this request itself carries a UTM source
 * (a new tagged link replaces the previous source).
 */
export function resolveAttribution(input: {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
  requestHost?: string;
  existing: Attribution | null;
  day: string;
}): Attribution {
  const fromRef = utmFromUrl(input.referrer);
  const source = canonicalSource(input.utmSource) || canonicalSource(fromRef.source);
  const medium = sanitizeToken(input.utmMedium, 40) || sanitizeToken(fromRef.medium, 40);
  const campaign = sanitizeToken(input.utmCampaign, 40) || sanitizeToken(fromRef.campaign, 40);
  if (source) return { s: source, m: medium, c: campaign, d: input.day };
  if (input.existing && input.existing.d === input.day && input.existing.s) return input.existing;
  const referred = sourceFromReferrer(input.referrer, input.requestHost ?? "");
  if (referred) return { s: referred, m: "referral", c: "", d: input.day };
  return { s: "direct", m: "", c: "", d: input.day };
}

const BOT_UA =
  /bot\b|spider|crawl|slurp|mediapartners|facebookexternalhit|whatsapp|headless|phantomjs|lighthouse|pagespeed|pingdom|uptimerobot|curl\/|wget\/|python-requests|go-http-client|axios\/|node-fetch|semrush|ahrefs|petalbot|bytespider|gptbot|claudebot|ccbot|amazonbot|applebot|duckduckbot|yandexbot|baiduspider|sogou|embedly|discordbot|slackbot|telegrambot|bingpreview/i;

export function isBot(ua: string | null | undefined): boolean {
  if (!ua) return true;
  const t = ua.trim();
  if (t.length < 12) return true;
  return BOT_UA.test(t);
}

export function isPrefetch(h: { get(name: string): string | null }): boolean {
  const purpose = `${h.get("purpose") || ""} ${h.get("sec-purpose") || ""}`.toLowerCase();
  if (purpose.includes("prefetch")) return true;
  if (h.get("next-router-prefetch") === "1" || h.get("x-middleware-prefetch") === "1") return true;
  return false;
}

export function newVisitorId(): string {
  return randomBytes(16).toString("base64url");
}

export function validVisitorId(v: string | null | undefined): string | null {
  return v && /^[A-Za-z0-9_-]{16,40}$/.test(v) ? v : null;
}

/** Opaque id stored in the database. Changes with the Tehran day; the raw cookie is not kept. */
export function visitorKey(secret: string, day: string, vid: string): string {
  return createHmac("sha256", secret).update(`analytics:v1:${day}:${vid}`).digest("base64url").slice(0, 32);
}

/** Rate-limit bucket. The address itself is never written to the database. */
export function ipLimitKey(secret: string, day: string, ip: string): string {
  return createHmac("sha256", secret).update(`analytics:ip:${day}:${ip}`).digest("base64url").slice(0, 24);
}

export function signAttribution(secret: string, a: Attribution): string {
  const body = Buffer.from(JSON.stringify({ s: a.s, m: a.m, c: a.c, d: a.d })).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url").slice(0, 22);
  return `${body}.${sig}`;
}

export function readAttribution(secret: string, raw: string | null | undefined): Attribution | null {
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i <= 0) return null;
  const body = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const expected = createHmac("sha256", secret).update(body).digest("base64url").slice(0, 22);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Partial<Attribution>;
    if (!p || typeof p.s !== "string" || typeof p.d !== "string") return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.d)) return null;
    if (!p.s || p.s.length > 32) return null;
    const m = typeof p.m === "string" ? p.m : "";
    const c = typeof p.c === "string" ? p.c : "";
    if (m.length > 40 || c.length > 40) return null;
    return { s: p.s, m, c, d: p.d };
  } catch {
    return null;
  }
}

export function seenTooSoon(map: Map<string, number>, key: string, now: number, windowMs: number): boolean {
  const prev = map.get(key);
  if (prev !== undefined && now - prev < windowMs) return true;
  map.set(key, now);
  if (map.size > 8000) {
    for (const [k, t] of map) if (now - t >= windowMs) map.delete(k);
  }
  return false;
}

const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";
function digitsEn(input: string): string {
  return input.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));
}

/** Hide referral values that look like a phone or email. Reward codes stay visible. */
export function safeReferralLabel(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const t = ref.trim().slice(0, 32);
  if (!t) return null;
  const en = digitsEn(t);
  if (/09\d{9}/.test(en) || en.includes("@")) return null;
  return t;
}

export function clientIp(h: { get(name: string): string | null }): string | null {
  const raw = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "";
  if (!raw || raw === "unknown" || raw === "local") return null;
  if (!/^[0-9a-fA-F:.]+$/.test(raw) || raw.length > 64) return null;
  return raw;
}
