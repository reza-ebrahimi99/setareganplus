/**
 * Single entry for reports/consumers: always go through FORMULA_REGISTRY.
 */

import { getFormula } from "@/lib/kpi/formulas";
import type {
  FormulaContext,
  KpiFormulaKey,
  KpiSeriesPoint,
} from "@/lib/kpi/types";

export async function runKpiFormula(
  formulaKey: KpiFormulaKey,
  ctx: FormulaContext,
): Promise<KpiSeriesPoint[]> {
  return getFormula(formulaKey)(ctx);
}

/** Sum all point values (grain=total / none dimension). */
export function sumKpiPoints(points: readonly KpiSeriesPoint[]): number {
  return points.reduce((sum, point) => sum + point.value, 0);
}

/** Map ownerUserId / attributedUserId dimension points → userId → value. */
export function kpiPointsByUserId(
  points: readonly KpiSeriesPoint[],
  dimensionKey: "ownerUserId" | "attributedUserId" = "ownerUserId",
): Map<string, number> {
  const map = new Map<string, number>();
  for (const point of points) {
    const id = point.dimensions[dimensionKey];
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + point.value);
  }
  return map;
}
