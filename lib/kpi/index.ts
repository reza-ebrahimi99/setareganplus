/**
 * Public surface for Admissions CRM v2 KPI Computation Engine.
 */

export { listKpiCatalog, getKpiDefinition, isKpiKey } from "@/lib/kpi/registry";
export {
  computeKpis,
  parseKpiKeys,
  assertKpiQuery,
  isKpiGrain,
  isKpiDimension,
  KpiComputeError,
} from "@/lib/kpi/compute";
export { buildKpiCacheKey, clampKpiTtlSeconds } from "@/lib/kpi/cache";
export { aggregateEvents, bucketStartForGrain } from "@/lib/kpi/aggregation";
export {
  runKpiFormula,
  sumKpiPoints,
  kpiPointsByUserId,
} from "@/lib/kpi/run-formula";
export { FORMULA_REGISTRY, getFormula } from "@/lib/kpi/formulas";
export type {
  KpiKey,
  KpiDefinition,
  KpiComputeQuery,
  KpiResultBundle,
  KpiSeriesPoint,
  KpiGrain,
  KpiDimension,
  KpiUnit,
  KpiLeadScope,
  KpiFormulaKey,
} from "@/lib/kpi/types";
