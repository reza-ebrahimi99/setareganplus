import { prisma } from "@/lib/prisma";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { V2_REVIEW_STATUS_LABELS, normalizeV2ReviewStatus } from "@/lib/guidance/journey-v2/step-review/status";

export type RevisionHistoryEntry = {
  id: string;
  version: number;
  action: string;
  actionLabel: string;
  actorType: string;
  actorName: string;
  reason: string | null;
  atLabel: string;
  diffRows: Array<{ field: string; before: string; after: string }>;
};

const ACTION_LABELS: Record<string, string> = {
  COUNSELOR_EDIT: "ویرایش مشاور",
  REVISION_REQUESTED: "درخواست اصلاح",
  RESUBMITTED: "ارسال مجدد دانش‌آموز",
  RESTORE: "بازگردانی نسخه",
};

function flattenForDiff(value: unknown, prefix = ""): Record<string, string> {
  if (value === null || value === undefined) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    return { [prefix || "مقدار"]: String(value) };
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenForDiff(v, key));
    } else {
      out[key] = v == null ? "" : String(v);
    }
  }
  return out;
}

function buildDiff(before: unknown, after: unknown): Array<{ field: string; before: string; after: string }> {
  const b = flattenForDiff(before);
  const a = flattenForDiff(after);
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const rows: Array<{ field: string; before: string; after: string }> = [];
  for (const field of keys) {
    const bv = b[field] ?? "";
    const av = a[field] ?? "";
    if (bv !== av) rows.push({ field, before: bv, after: av });
  }
  return rows;
}

export async function loadStepRevisionHistory(params: {
  organizationId: string;
  planId: string;
  stepNumber: number;
}): Promise<RevisionHistoryEntry[]> {
  const review = await prisma.guidanceStepReview.findUnique({
    where: {
      organizationId_planId_stepNumber: {
        organizationId: params.organizationId,
        planId: params.planId,
        stepNumber: params.stepNumber,
      },
    },
    select: { id: true },
  });
  if (!review) return [];

  const revisions = await prisma.guidanceStepRevision.findMany({
    where: { organizationId: params.organizationId, reviewId: review.id },
    orderBy: { version: "desc" },
    take: 40,
    include: {
      review: false,
    },
  });

  const actorIds = revisions.map((r) => r.actorUserId).filter(Boolean) as string[];
  const actors =
    actorIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, firstName: true, lastName: true },
        });
  const actorMap = new Map(actors.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));

  const events = await prisma.guidanceStepReviewEvent.findMany({
    where: { organizationId: params.organizationId, reviewId: review.id },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { actor: { select: { firstName: true, lastName: true } } },
  });

  const fromRevisions: RevisionHistoryEntry[] = revisions.map((r) => ({
    id: r.id,
    version: r.version,
    action: r.action,
    actionLabel: ACTION_LABELS[r.action] ?? r.action,
    actorType: r.actorType,
    actorName: r.actorUserId ? (actorMap.get(r.actorUserId) ?? "کاربر") : "سیستم",
    reason: r.reason,
    atLabel: formatJalaliDateTimeShort(r.createdAt),
    diffRows: buildDiff(r.beforeSnapshot, r.afterSnapshot),
  }));

  const fromEvents: RevisionHistoryEntry[] = events.map((e, idx) => ({
    id: e.id,
    version: 1000 + idx,
    action: e.kind,
    actionLabel: ACTION_LABELS[e.kind] ?? V2_REVIEW_STATUS_LABELS[normalizeV2ReviewStatus(e.status)] ?? e.kind,
    actorType: e.actorUserId ? "USER" : "SYSTEM",
    actorName: e.actor
      ? `${e.actor.firstName} ${e.actor.lastName}`.trim()
      : "مشاور",
    reason: e.rejectReason ?? e.studentMessage,
    atLabel: formatJalaliDateTimeShort(e.createdAt),
    diffRows: [],
  }));

  return [...fromRevisions, ...fromEvents].sort((a, b) => b.version - a.version);
}
