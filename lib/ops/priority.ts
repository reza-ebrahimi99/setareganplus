import type { OperationalQueueItem, OpsPriority } from "@/lib/ops/types";
import { PRIORITY_RANK } from "@/lib/ops/types";

export function scoreBandPriority(
  scoreBand: string | null | undefined,
): OpsPriority {
  if (scoreBand === "HOT" || scoreBand === "QUALIFIED") return "HIGH";
  if (scoreBand === "WARM") return "NORMAL";
  return "NORMAL";
}

export function taskPriorityToOps(
  priority: string | null | undefined,
): OpsPriority {
  if (priority === "URGENT") return "URGENT";
  if (priority === "HIGH") return "HIGH";
  if (priority === "LOW") return "LOW";
  return "NORMAL";
}

/**
 * Shared ranking: escalated > SLA breached > priority > due age > createdAt.
 */
export function compareQueueItems(
  a: OperationalQueueItem,
  b: OperationalQueueItem,
): number {
  const aEsc = a.metadata.escalated === true ? 1 : 0;
  const bEsc = b.metadata.escalated === true ? 1 : 0;
  if (aEsc !== bEsc) return bEsc - aEsc;

  const slaRank = { BREACHED: 2, AT_RISK: 1, OK: 0 } as const;
  if (slaRank[a.slaState] !== slaRank[b.slaState]) {
    return slaRank[b.slaState] - slaRank[a.slaState];
  }

  if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) {
    return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
  }

  const aDue = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
  const bDue = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
  if (aDue !== bDue) return aDue - bDue;

  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}

export function sortQueueItems(
  items: OperationalQueueItem[],
): OperationalQueueItem[] {
  return [...items].sort(compareQueueItems);
}
