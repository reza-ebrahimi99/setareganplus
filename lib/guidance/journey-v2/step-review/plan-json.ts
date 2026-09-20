export function parseOpenRevisionSteps(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 18);
}

export function parseNeedsReviewFlags(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === true) out[k] = true;
  }
  return out;
}

export function addOpenRevisionStep(steps: number[], step: number): number[] {
  const set = new Set(steps);
  set.add(step);
  return Array.from(set).sort((a, b) => a - b);
}

export function removeOpenRevisionStep(steps: number[], step: number): number[] {
  return steps.filter((s) => s !== step);
}
