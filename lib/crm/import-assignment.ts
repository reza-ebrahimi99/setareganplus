export type ImportAssignmentConfig =
  | { method: "NONE" }
  | { method: "SINGLE"; ownerUserId: string }
  | { method: "EQUAL"; ownerUserIds: string[] }
  | { method: "ROUND_ROBIN"; ownerUserIds: string[] }
  | {
      method: "PERCENTAGE";
      allocations: Array<{ ownerUserId: string; percentage: number }>;
    };

export type ImportAssignmentPlan =
  | { ok: true; ownerUserIds: Array<string | null> }
  | { ok: false; error: string };

function validOwnerIds(ids: readonly string[]): string[] | null {
  const normalized = ids.map((id) => id.trim()).filter(Boolean);
  if (
    normalized.length === 0 ||
    normalized.length > 100 ||
    new Set(normalized).size !== normalized.length ||
    normalized.some((id) => id.length > 128)
  ) {
    return null;
  }
  return normalized;
}

export function parseImportAssignmentConfig(
  input: unknown,
): ImportAssignmentConfig | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const method = Reflect.get(input, "method");
  if (method === "NONE") return { method };
  if (method === "SINGLE") {
    const ownerUserId = Reflect.get(input, "ownerUserId");
    return typeof ownerUserId === "string" && ownerUserId.trim()
      ? { method, ownerUserId: ownerUserId.trim() }
      : null;
  }
  if (method === "EQUAL" || method === "ROUND_ROBIN") {
    const rawIds = Reflect.get(input, "ownerUserIds");
    if (!Array.isArray(rawIds) || rawIds.some((id) => typeof id !== "string")) {
      return null;
    }
    const ownerUserIds = validOwnerIds(rawIds as string[]);
    return ownerUserIds ? { method, ownerUserIds } : null;
  }
  if (method === "PERCENTAGE") {
    const rawAllocations = Reflect.get(input, "allocations");
    if (!Array.isArray(rawAllocations) || rawAllocations.length > 100) return null;
    const allocations: Array<{ ownerUserId: string; percentage: number }> = [];
    for (const item of rawAllocations) {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const ownerUserId = Reflect.get(item, "ownerUserId");
      const percentage = Reflect.get(item, "percentage");
      if (
        typeof ownerUserId !== "string" ||
        !ownerUserId.trim() ||
        typeof percentage !== "number" ||
        !Number.isInteger(percentage) ||
        percentage <= 0 ||
        percentage > 100
      ) {
        return null;
      }
      allocations.push({ ownerUserId: ownerUserId.trim(), percentage });
    }
    const ids = validOwnerIds(allocations.map((item) => item.ownerUserId));
    if (!ids || allocations.reduce((sum, item) => sum + item.percentage, 0) !== 100) {
      return null;
    }
    return { method, allocations };
  }
  return null;
}

function distributedCounts(total: number, weights: readonly number[]): number[] {
  const raw = weights.map((weight) => (total * weight) / weights.reduce((a, b) => a + b, 0));
  const counts = raw.map(Math.floor);
  const remainder = total - counts.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remainder; index += 1) {
    counts[order[index % order.length]!.index] += 1;
  }
  return counts;
}

export function buildImportAssignmentPlan(
  rowCount: number,
  config: ImportAssignmentConfig,
): ImportAssignmentPlan {
  if (!Number.isSafeInteger(rowCount) || rowCount < 0 || rowCount > 10_000) {
    return { ok: false, error: "تعداد ردیف‌ها برای تخصیص نامعتبر است." };
  }
  if (config.method === "NONE") {
    return { ok: true, ownerUserIds: Array(rowCount).fill(null) };
  }
  if (config.method === "SINGLE") {
    return { ok: true, ownerUserIds: Array(rowCount).fill(config.ownerUserId) };
  }
  if (config.method === "ROUND_ROBIN") {
    return {
      ok: true,
      ownerUserIds: Array.from(
        { length: rowCount },
        (_, index) => config.ownerUserIds[index % config.ownerUserIds.length]!,
      ),
    };
  }

  const ownerUserIds =
    config.method === "EQUAL"
      ? config.ownerUserIds
      : config.allocations.map((item) => item.ownerUserId);
  const weights =
    config.method === "EQUAL"
      ? ownerUserIds.map(() => 1)
      : config.allocations.map((item) => item.percentage);
  const counts = distributedCounts(rowCount, weights);
  return {
    ok: true,
    ownerUserIds: counts.flatMap((count, index) =>
      Array(count).fill(ownerUserIds[index]!),
    ),
  };
}
