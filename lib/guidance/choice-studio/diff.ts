/**
 * INITIAL vs FINAL comparison. Identity is official choice code.
 */

import type { ChoiceDiffRow, ChoiceDiffSummary } from "@/lib/guidance/choice-studio/types";

export type DiffableChoice = {
  sortOrder: number;
  officialCode: string | null;
  major: string;
  university: string;
  city?: string;
  educationType?: string;
  band?: string | null;
  notes?: string;
  rationale?: string;
  isActive?: boolean;
};

function keyOf(item: DiffableChoice): string | null {
  const code = (item.officialCode ?? "").trim();
  if (code) return `code:${code}`;
  const fallback = `${item.major}|${item.university}|${item.educationType ?? ""}`.trim();
  return fallback ? `row:${fallback}` : null;
}

export function diffChoiceLists(
  initialItems: DiffableChoice[],
  finalItems: DiffableChoice[],
): ChoiceDiffSummary {
  const initial = initialItems.filter((i) => i.isActive !== false);
  const finals = finalItems.filter((i) => i.isActive !== false);

  const initialByKey = new Map<string, DiffableChoice>();
  for (const item of initial) {
    const key = keyOf(item);
    if (key && !initialByKey.has(key)) initialByKey.set(key, item);
  }
  const finalByKey = new Map<string, DiffableChoice>();
  for (const item of finals) {
    const key = keyOf(item);
    if (key && !finalByKey.has(key)) finalByKey.set(key, item);
  }

  const rows: ChoiceDiffRow[] = [];
  const seen = new Set<string>();

  for (const [key, next] of finalByKey) {
    seen.add(key);
    const prev = initialByKey.get(key);
    if (!prev) {
      rows.push({
        kind: "ADDED",
        code: next.officialCode ?? "—",
        major: next.major,
        university: next.university,
        fromPriority: null,
        toPriority: next.sortOrder,
        detail: "افزوده‌شده",
      });
      continue;
    }
    if (prev.sortOrder !== next.sortOrder) {
      rows.push({
        kind: "MOVED",
        code: next.officialCode ?? "—",
        major: next.major,
        university: next.university,
        fromPriority: prev.sortOrder,
        toPriority: next.sortOrder,
        detail: `از اولویت ${prev.sortOrder} به ${next.sortOrder}`,
      });
      continue;
    }
    const changed =
      prev.major !== next.major ||
      prev.university !== next.university ||
      (prev.city ?? "") !== (next.city ?? "") ||
      (prev.educationType ?? "") !== (next.educationType ?? "") ||
      (prev.band ?? "") !== (next.band ?? "") ||
      (prev.notes ?? "") !== (next.notes ?? "") ||
      (prev.rationale ?? "") !== (next.rationale ?? "");
    rows.push({
      kind: changed ? "CHANGED" : "UNCHANGED",
      code: next.officialCode ?? "—",
      major: next.major,
      university: next.university,
      fromPriority: prev.sortOrder,
      toPriority: next.sortOrder,
      detail: changed ? "ویرایش فیلدها" : "بدون تغییر",
    });
  }

  for (const [key, prev] of initialByKey) {
    if (seen.has(key)) continue;
    rows.push({
      kind: "REMOVED",
      code: prev.officialCode ?? "—",
      major: prev.major,
      university: prev.university,
      fromPriority: prev.sortOrder,
      toPriority: null,
      detail: "حذف‌شده",
    });
  }

  const order: Record<ChoiceDiffRow["kind"], number> = {
    ADDED: 0,
    REMOVED: 1,
    MOVED: 2,
    CHANGED: 3,
    UNCHANGED: 4,
  };
  rows.sort((a, b) => {
    const kind = order[a.kind] - order[b.kind];
    if (kind !== 0) return kind;
    return (a.toPriority ?? a.fromPriority ?? 0) - (b.toPriority ?? b.fromPriority ?? 0);
  });

  return {
    added: rows.filter((r) => r.kind === "ADDED").length,
    removed: rows.filter((r) => r.kind === "REMOVED").length,
    moved: rows.filter((r) => r.kind === "MOVED").length,
    changed: rows.filter((r) => r.kind === "CHANGED").length,
    unchanged: rows.filter((r) => r.kind === "UNCHANGED").length,
    rows,
  };
}

export function labelDiffKind(kind: ChoiceDiffRow["kind"]): string {
  switch (kind) {
    case "ADDED":
      return "افزوده‌شده";
    case "REMOVED":
      return "حذف‌شده";
    case "MOVED":
      return "جابه‌جا‌شده";
    case "CHANGED":
      return "ویرایش‌شده";
    default:
      return "بدون تغییر";
  }
}
