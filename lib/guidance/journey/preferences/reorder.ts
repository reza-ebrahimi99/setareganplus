/**
 * Guidance Journey Engine — shared rank-list helpers (Steps 6, 8, 9; and the
 * province list in Step 7). Pure functions only.
 */

export function moveItem<T>(list: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return [...list];
  const next = [...list];
  const tmp = next[index]!;
  next[index] = next[target]!;
  next[target] = tmp;
  return next;
}

export function toRankMap(orderedCodes: readonly string[]): Record<string, number> {
  const map: Record<string, number> = {};
  orderedCodes.forEach((code, index) => {
    map[code] = index + 1;
  });
  return map;
}
