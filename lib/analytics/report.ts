import "server-only";
import { prisma } from "@/lib/prisma";
import {
  clampRange,
  eachTehranDay,
  safeReferralLabel,
  shiftTehranDay,
  tehranDay,
  tehranDayStart,
} from "./classify";
import { maybeRollup } from "./store";

export type DayPoint = { day: string; hits: number; uniques: number };
export type SourceRow = { source: string; hits: number; uniques: number };
export type CampaignRow = { source: string; medium: string; campaign: string; hits: number; uniques: number };
export type PathRow = { path: string; title: string | null; hits: number; uniques: number };
export type QuizSourceRow = { source: string; starts: number; completions: number };

export type AnalyticsReport = {
  from: string;
  to: string;
  visits: number;
  uniques: number;
  byDay: DayPoint[];
  sources: SourceRow[];
  campaigns: CampaignRow[];
  pages: PathRow[];
  news: PathRow[];
  quizBySource: QuizSourceRow[];
  quizStarts: number;
  quizCompletions: number;
  rewards: number;
  unattributedRewards: number;
  referrals: { label: string; count: number }[];
  hiddenReferrals: number;
};

type CountRow = { key: string; hits: number | bigint; uniques?: number | bigint; day?: string; source?: string; medium?: string; campaign?: string; path?: string; kind?: string };

function num(v: number | bigint | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "bigint" ? Number(v) : Number(v);
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function resolveReportRange(sp: { range?: string; from?: string; to?: string }, now = new Date()): { from: string; to: string; key: string } {
  const today = tehranDay(now);
  if (sp.from && sp.to && DAY_RE.test(sp.from) && DAY_RE.test(sp.to)) {
    const clamped = clampRange(sp.from, sp.to);
    return { ...clamped, key: "custom" };
  }
  const range = sp.range ?? "7";
  if (range === "today" || range === "1") return { from: today, to: today, key: "today" };
  const n = range === "30" ? 30 : range === "90" ? 90 : 7;
  return { from: shiftTehranDay(today, -(n - 1)), to: today, key: String(n) };
}

export async function getAnalyticsReport(from: string, to: string): Promise<AnalyticsReport> {
  await maybeRollup().catch(() => undefined);
  const start = tehranDayStart(from);
  const end = new Date(tehranDayStart(to).getTime() + 24 * 3_600_000);

  const [rawDays, dailyDays, rawSources, dailySources, rawCampaigns, dailyCampaigns, rawPaths, dailyPaths, rawQuiz, dailyQuiz, rewards, referralGroups] =
    await Promise.all([
      prisma.$queryRaw<CountRow[]>`
        SELECT day, CAST(COUNT(*) AS INT) AS hits, CAST(COUNT(DISTINCT visitor) AS INT) AS uniques
        FROM "AnalyticsHit"
        WHERE kind = 'pageview' AND day >= ${from} AND day <= ${to}
        GROUP BY day`,
      prisma.analyticsDaily.findMany({
        where: { level: "site", kind: "pageview", day: { gte: from, lte: to } },
        select: { day: true, hits: true, uniques: true },
      }),
      prisma.$queryRaw<CountRow[]>`
        SELECT source AS key, CAST(COUNT(*) AS INT) AS hits, CAST(COUNT(DISTINCT visitor) AS INT) AS uniques
        FROM "AnalyticsHit"
        WHERE kind = 'pageview' AND day >= ${from} AND day <= ${to}
        GROUP BY source`,
      prisma.analyticsDaily.groupBy({
        by: ["source"],
        where: { level: "source", kind: "pageview", day: { gte: from, lte: to } },
        _sum: { hits: true, uniques: true },
      }),
      prisma.$queryRaw<CountRow[]>`
        SELECT source, medium, campaign, CAST(COUNT(*) AS INT) AS hits, CAST(COUNT(DISTINCT visitor) AS INT) AS uniques
        FROM "AnalyticsHit"
        WHERE kind = 'pageview' AND day >= ${from} AND day <= ${to} AND campaign <> ''
        GROUP BY source, medium, campaign
        ORDER BY hits DESC
        LIMIT 12`,
      prisma.analyticsDaily.findMany({
        where: { level: "campaign", kind: "pageview", day: { gte: from, lte: to }, campaign: { not: "" } },
        select: { day: true, source: true, medium: true, campaign: true, hits: true, uniques: true },
      }),
      prisma.$queryRaw<CountRow[]>`
        SELECT path AS key, CAST(COUNT(*) AS INT) AS hits, CAST(COUNT(DISTINCT visitor) AS INT) AS uniques
        FROM "AnalyticsHit"
        WHERE kind = 'pageview' AND day >= ${from} AND day <= ${to}
        GROUP BY path
        ORDER BY hits DESC
        LIMIT 40`,
      prisma.analyticsDaily.groupBy({
        by: ["path"],
        where: { level: "path", kind: "pageview", day: { gte: from, lte: to } },
        _sum: { hits: true, uniques: true },
      }),
      prisma.$queryRaw<CountRow[]>`
        SELECT source AS key, kind, CAST(COUNT(*) AS INT) AS hits
        FROM "AnalyticsHit"
        WHERE kind IN ('quiz_start', 'quiz_complete') AND day >= ${from} AND day <= ${to}
        GROUP BY source, kind`,
      prisma.analyticsDaily.findMany({
        where: { level: "source", kind: { in: ["quiz_start", "quiz_complete"] }, day: { gte: from, lte: to } },
        select: { day: true, kind: true, source: true, hits: true },
      }),
      prisma.studyQuizLead.count({ where: { createdAt: { gte: start, lt: end } } }),
      prisma.studyQuizLead.groupBy({
        by: ["referral"],
        where: { createdAt: { gte: start, lt: end } },
        _count: { _all: true },
      }),
    ]);

  const daysMerged = mergeDays(rawDays, dailyDays);
  const byDay = eachTehranDay(from, to).map((day) => daysMerged.get(day) ?? { day, hits: 0, uniques: 0 });
  const visits = byDay.reduce((s, d) => s + d.hits, 0);
  const uniques = byDay.reduce((s, d) => s + d.uniques, 0);

  const rawDaySet = new Set(rawDays.flatMap((r) => (r.day ? [r.day] : [])));
  const rolled = dailyDays.some((d) => !rawDaySet.has(d.day));
  const sources = mergeSources(rawSources, dailySources, rolled);
  const campaigns = mergeCampaigns(rawCampaigns, dailyCampaigns, rawDaySet);
  const pathRows = mergePaths(rawPaths, dailyPaths, rolled);
  const titled = await attachTitles(pathRows);
  const news = titled.filter((p) => p.path.startsWith("/news/") && p.path !== "/news").slice(0, 12);
  const pages = titled.slice(0, 10);

  const quizMap = new Map<string, QuizSourceRow>();
  const addQuiz = (source: string, kind: string, hits: number) => {
    const row = quizMap.get(source) ?? { source, starts: 0, completions: 0 };
    if (kind === "quiz_start") row.starts += hits;
    if (kind === "quiz_complete") row.completions += hits;
    quizMap.set(source, row);
  };
  for (const row of rawQuiz) addQuiz(row.key, row.kind || "", num(row.hits));
  for (const row of dailyQuiz) {
    if (rawDaySet.has(row.day)) continue;
    addQuiz(row.source, row.kind, row.hits);
  }
  const quizBySource = [...quizMap.values()].sort((a, b) => b.completions - a.completions || b.starts - a.starts);
  const quizStarts = quizBySource.reduce((s, r) => s + r.starts, 0);
  const quizCompletions = quizBySource.reduce((s, r) => s + r.completions, 0);

  let hiddenReferrals = 0;
  const referrals: { label: string; count: number }[] = [];
  for (const g of referralGroups) {
    const count = g._count._all;
    const label = safeReferralLabel(g.referral);
    if (!label) {
      if (g.referral) hiddenReferrals += count;
      continue;
    }
    referrals.push({ label, count });
  }
  referrals.sort((a, b) => b.count - a.count);

  return {
    from,
    to,
    visits,
    uniques,
    byDay,
    sources,
    campaigns: campaigns.slice(0, 12),
    pages,
    news,
    quizBySource,
    quizStarts,
    quizCompletions,
    rewards: rewards,
    unattributedRewards: Math.max(0, rewards - quizCompletions),
    referrals: referrals.slice(0, 8),
    hiddenReferrals,
  };
}

function mergeDays(raw: CountRow[], daily: { day: string; hits: number; uniques: number }[]): Map<string, DayPoint> {
  const map = new Map<string, DayPoint>();
  for (const row of raw) {
    map.set(row.day || "", { day: row.day || "", hits: num(row.hits), uniques: num(row.uniques) });
  }
  for (const row of daily) {
    if (map.has(row.day)) continue;
    map.set(row.day, { day: row.day, hits: row.hits, uniques: row.uniques });
  }
  return map;
}

function mergeSources(raw: CountRow[], daily: { source: string; _sum: { hits: number | null; uniques: number | null } }[], includeDaily: boolean): SourceRow[] {
  const map = new Map<string, SourceRow>();
  for (const row of raw) {
    map.set(row.key, { source: row.key, hits: num(row.hits), uniques: num(row.uniques) });
  }
  if (includeDaily) {
    for (const row of daily) {
      const cur = map.get(row.source) ?? { source: row.source, hits: 0, uniques: 0 };
      cur.hits += row._sum.hits ?? 0;
      cur.uniques += row._sum.uniques ?? 0;
      map.set(row.source, cur);
    }
  } else if (raw.length === 0) {
    for (const row of daily) {
      map.set(row.source, { source: row.source, hits: row._sum.hits ?? 0, uniques: row._sum.uniques ?? 0 });
    }
  }
  return [...map.values()].sort((a, b) => b.hits - a.hits);
}

function mergeCampaigns(
  raw: CountRow[],
  daily: { day: string; source: string; medium: string; campaign: string; hits: number; uniques: number }[],
  rawDays: Set<string>,
): CampaignRow[] {
  const map = new Map<string, CampaignRow>();
  const add = (source: string, medium: string, campaign: string, hits: number, uniques: number) => {
    const k = `${source}|${medium}|${campaign}`;
    const cur = map.get(k) ?? { source, medium, campaign, hits: 0, uniques: 0 };
    cur.hits += hits;
    cur.uniques += uniques;
    map.set(k, cur);
  };
  for (const row of raw) add(row.source || "", row.medium || "", row.campaign || "", num(row.hits), num(row.uniques));
  for (const row of daily) {
    if (rawDays.has(row.day)) continue;
    add(row.source, row.medium, row.campaign, row.hits, row.uniques);
  }
  return [...map.values()].sort((a, b) => b.hits - a.hits);
}

function mergePaths(raw: CountRow[], daily: { path: string; _sum: { hits: number | null; uniques: number | null } }[], rolled: boolean): PathRow[] {
  const map = new Map<string, PathRow>();
  for (const row of raw) map.set(row.key, { path: row.key, title: null, hits: num(row.hits), uniques: num(row.uniques) });
  if (rolled || raw.length === 0) {
    for (const row of daily) {
      const cur = map.get(row.path) ?? { path: row.path, title: null, hits: 0, uniques: 0 };
      cur.hits += row._sum.hits ?? 0;
      cur.uniques += row._sum.uniques ?? 0;
      map.set(row.path, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.hits - a.hits);
}

async function attachTitles(rows: PathRow[]): Promise<PathRow[]> {
  const slugs = rows
    .filter((r) => r.path.startsWith("/news/") && !r.path.slice("/news/".length).includes("/"))
    .map((r) => r.path.slice("/news/".length));
  if (slugs.length === 0) return rows;
  const news = await prisma.news.findMany({ where: { slug: { in: slugs } }, select: { slug: true, title: true } });
  const titles = new Map(news.map((n) => [n.slug, n.title]));
  return rows.map((r) => {
    const slug = r.path.startsWith("/news/") ? r.path.slice("/news/".length) : "";
    return { ...r, title: titles.get(slug) ?? null };
  });
}
