import "server-only";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { allow } from "@/lib/shop/ratelimit";
import { QUIZ_PATH } from "@/lib/quiz/content";
import { Prisma } from "@/generated/prisma/client";
import {
  DAILY_RETENTION_DAYS,
  RAW_RETENTION_DAYS,
  SRC_COOKIE,
  VID_COOKIE,
  type Attribution,
  canonicalSource,
  clientIp,
  cookieMaxAgeSec,
  ipLimitKey,
  isBot,
  isPrefetch,
  newVisitorId,
  normalizePublicPath,
  readAttribution,
  resolveAttribution,
  sanitizeToken,
  seenTooSoon,
  shiftTehranDay,
  signAttribution,
  tehranDay,
  validVisitorId,
  visitorKey,
} from "./classify";

const DEDUPE_MS = 15_000;
const recent = new Map<string, number>();
const PAGE_RATE = 90;
const PAGE_WINDOW_MS = 60_000;

export type StoredHit = {
  day: string;
  kind: string;
  path: string;
  source: string;
  medium: string;
  campaign: string;
  visitor: string;
};

export type RecordResult =
  | { status: 204 }
  | { status: 429 }
  | { status: 204; vid: string; attr: string; maxAge: number };

type HitBody = {
  path?: unknown;
  ref?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
};

function secret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

function asText(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function cookieSecure() {
  return process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1";
}

export function pageViewCookies(result: RecordResult) {
  if (!("vid" in result)) return [];
  const base = {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    path: "/",
    maxAge: result.maxAge,
  };
  return [
    { name: VID_COOKIE, value: result.vid, ...base },
    { name: SRC_COOKIE, value: result.attr, ...base },
  ];
}

/** Accept a public page-view beacon. Never stores the IP, user agent, or query string. */
export async function recordPageView(opts: {
  body: HitBody;
  userAgent: string | null;
  headerGet: (name: string) => string | null;
  vidCookie: string | null;
  attrCookie: string | null;
  now?: Date;
}): Promise<RecordResult> {
  try {
    if (isBot(opts.userAgent) || isPrefetch({ get: opts.headerGet })) return { status: 204 };
    const path = normalizePublicPath(asText(opts.body.path, 300));
    if (!path) return { status: 204 };
    const key = secret();
    if (!key) return { status: 204 };
    const now = opts.now ?? new Date();
    const day = tehranDay(now);
    const ip = clientIp({ get: opts.headerGet });
    if (ip && !allow(ipLimitKey(key, day, ip), PAGE_RATE, PAGE_WINDOW_MS)) return { status: 429 };
    if (!ip && !allow("analytics:anon", 240, 10_000)) return { status: 429 };

    const vid = validVisitorId(opts.vidCookie) ?? newVisitorId();
    const existing = readAttribution(key, opts.attrCookie);
    const attr = resolveAttribution({
      utmSource: asText(opts.body.utm_source, 80),
      utmMedium: asText(opts.body.utm_medium, 80),
      utmCampaign: asText(opts.body.utm_campaign, 80),
      referrer: asText(opts.body.ref, 500),
      requestHost: opts.headerGet("x-forwarded-host") || opts.headerGet("host") || "",
      existing,
      day,
    });
    const visitor = visitorKey(key, day, vid);
    const incoming = canonicalSource(asText(opts.body.utm_source, 80));
    const sourceChanged = !!incoming && (!existing || existing.d !== day || existing.s !== incoming);
    if (!sourceChanged && seenTooSoon(recent, `${visitor}|pageview|${path}`, now.getTime(), DEDUPE_MS)) {
      return { status: 204, vid, attr: signAttribution(key, attr), maxAge: cookieMaxAgeSec(now) };
    }
    await prisma.analyticsHit.create({
      data: { day, kind: "pageview", path, source: attr.s, medium: attr.m, campaign: attr.c, visitor },
    });
    void maybeRollup();
    return { status: 204, vid, attr: signAttribution(key, attr), maxAge: cookieMaxAgeSec(now) };
  } catch {
    return { status: 204 };
  }
}

/** Quiz start (new OTP) or completion (new reward). Failures never affect the quiz. */
export async function recordQuizEvent(kind: "quiz_start" | "quiz_complete"): Promise<void> {
  try {
    const key = secret();
    if (!key) return;
    const jar = await cookies();
    const h = await headers();
    const now = new Date();
    const day = tehranDay(now);
    const headerGet = (name: string) => h.get(name);
    if (isBot(h.get("user-agent")) || isPrefetch({ get: headerGet })) return;
    const vid = validVisitorId(jar.get(VID_COOKIE)?.value) ?? newVisitorId();
    const referrer = h.get("referer");
    const attr = resolveAttribution({
      referrer,
      requestHost: h.get("x-forwarded-host") || h.get("host") || "",
      existing: readAttribution(key, jar.get(SRC_COOKIE)?.value),
      day,
    });
    const visitor = visitorKey(key, day, vid);
    if (kind === "quiz_start") {
      const prev = await prisma.analyticsHit.findFirst({
        where: { visitor, kind, day, createdAt: { gte: new Date(now.getTime() - 30 * 60_000) } },
        select: { id: true },
      });
      if (prev) return;
    }
    await prisma.analyticsHit.create({
      data: {
        day,
        kind,
        path: QUIZ_PATH,
        source: attr.s,
        medium: attr.m,
        campaign: attr.c,
        visitor,
      },
    });
    const maxAge = cookieMaxAgeSec(now);
    const secure = cookieSecure();
    jar.set(VID_COOKIE, vid, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge });
    jar.set(SRC_COOKIE, signAttribution(key, attr), { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge });
    void maybeRollup();
  } catch {
    /* analytics must not break the quiz */
  }
}

type AggRow = {
  day: string;
  kind: string;
  path: string;
  source: string;
  medium: string;
  campaign: string;
  hits: number | bigint;
  uniques: number | bigint;
};

function n(v: number | bigint): number {
  return typeof v === "bigint" ? Number(v) : Number(v);
}

let lastRollup = 0;
let rolling: Promise<void> | null = null;

export function maybeRollup(): Promise<void> {
  const now = Date.now();
  if (now - lastRollup < 6 * 3_600_000) return Promise.resolve();
  if (rolling) return rolling;
  lastRollup = now;
  rolling = rollupAnalytics()
    .catch(() => {
      lastRollup = 0;
    })
    .finally(() => {
      rolling = null;
    });
  return rolling;
}

/** Fold raw hits older than the retention window into daily totals, inside one transaction. */
export async function rollupAnalytics(now = new Date()): Promise<void> {
  const cutoff = shiftTehranDay(tehranDay(now), -RAW_RETENTION_DAYS);
  const dropBefore = shiftTehranDay(tehranDay(now), -DAILY_RETENTION_DAYS);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(814201)`;
    const site = await tx.$queryRaw<AggRow[]>`
      SELECT day, kind, '' AS path, '' AS source, '' AS medium, '' AS campaign,
             CAST(COUNT(*) AS INT) AS hits,
             CAST(COUNT(DISTINCT visitor) AS INT) AS uniques
      FROM "AnalyticsHit"
      WHERE day < ${cutoff}
      GROUP BY day, kind`;
    const source = await tx.$queryRaw<AggRow[]>`
      SELECT day, kind, '' AS path, source, '' AS medium, '' AS campaign,
             CAST(COUNT(*) AS INT) AS hits,
             CAST(COUNT(DISTINCT visitor) AS INT) AS uniques
      FROM "AnalyticsHit"
      WHERE day < ${cutoff}
      GROUP BY day, kind, source`;
    const campaign = await tx.$queryRaw<AggRow[]>`
      SELECT day, kind, '' AS path, source, medium, campaign,
             CAST(COUNT(*) AS INT) AS hits,
             CAST(COUNT(DISTINCT visitor) AS INT) AS uniques
      FROM "AnalyticsHit"
      WHERE day < ${cutoff} AND (medium <> '' OR campaign <> '')
      GROUP BY day, kind, source, medium, campaign`;
    const paths = await tx.$queryRaw<AggRow[]>`
      SELECT day, kind, path, '' AS source, '' AS medium, '' AS campaign,
             CAST(COUNT(*) AS INT) AS hits,
             CAST(COUNT(DISTINCT visitor) AS INT) AS uniques
      FROM "AnalyticsHit"
      WHERE day < ${cutoff}
      GROUP BY day, kind, path`;
    await upsertLevel(tx, "site", site);
    await upsertLevel(tx, "source", source);
    await upsertLevel(tx, "campaign", campaign);
    await upsertLevel(tx, "path", paths);
    await tx.analyticsHit.deleteMany({ where: { day: { lt: cutoff } } });
    await tx.analyticsDaily.deleteMany({ where: { day: { lt: dropBefore } } });
  }, { timeout: 30_000 });
}

async function upsertLevel(tx: Prisma.TransactionClient, level: string, rows: AggRow[]) {
  for (const row of rows) {
    const data = {
      day: row.day,
      level,
      kind: row.kind,
      path: row.path || "",
      source: canonicalSource(row.source) || row.source || "",
      medium: sanitizeToken(row.medium, 40),
      campaign: sanitizeToken(row.campaign, 40),
      hits: n(row.hits),
      uniques: n(row.uniques),
    };
    await tx.analyticsDaily.upsert({
      where: {
        day_level_kind_path_source_medium_campaign: {
          day: data.day,
          level: data.level,
          kind: data.kind,
          path: data.path,
          source: data.source,
          medium: data.medium,
          campaign: data.campaign,
        },
      },
      create: data,
      update: { hits: { increment: data.hits }, uniques: { increment: data.uniques } },
    });
  }
}
