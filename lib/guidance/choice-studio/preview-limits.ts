/**
 * Choice import preview limits and ordering (client-safe).
 */

import {
  SANJESH_ACTIVE_LIMIT,
  type CanonicalChoiceRow,
} from "@/lib/guidance/choice-studio/types";
import { toPersianDigits } from "@/lib/persian";

export { SANJESH_ACTIVE_LIMIT as CHOICE_DRAFT_ACTIVE_LIMIT };

export function sortPreviewRowsByPriority(rows: readonly CanonicalChoiceRow[]): CanonicalChoiceRow[] {
  return [...rows].sort((a, b) => {
    const pa = a.priority ?? a.sourceRow;
    const pb = b.priority ?? b.sourceRow;
    if (pa !== pb) return pa - pb;
    return a.sourceRow - b.sourceRow;
  });
}

export function countOverLimit(total: number, limit = SANJESH_ACTIVE_LIMIT): number {
  return Math.max(0, total - limit);
}

export function formatOverLimitBlockMessage(total: number, limit = SANJESH_ACTIVE_LIMIT): string {
  const extra = countOverLimit(total, limit);
  return `تعداد انتخاب‌ها ${toPersianDigits(String(total))} مورد است؛ حداکثر ${toPersianDigits(String(limit))} انتخاب مجاز است. ابتدا ${toPersianDigits(String(extra))} مورد را حذف کنید.`;
}

export function takeFirstRowsForDraft(
  rows: readonly CanonicalChoiceRow[],
  limit = SANJESH_ACTIVE_LIMIT,
): CanonicalChoiceRow[] {
  return sortPreviewRowsByPriority(rows).slice(0, limit);
}

export function collectDuplicateCodes(rows: readonly CanonicalChoiceRow[]): string[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.code) continue;
    map.set(row.code, (map.get(row.code) ?? 0) + 1);
  }
  return [...map.entries()].filter(([, n]) => n > 1).map(([code]) => code);
}
