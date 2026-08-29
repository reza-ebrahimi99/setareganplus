/**
 * Admissions CRM v2 — KPI Computation Engine types (Sprint 3).
 */

export type KpiUnit = "count" | "rials" | "ratio";

export type KpiSource = "SNAPSHOTS" | "LEADS" | "CRM_ACTIVITIES";

export type KpiDimension =
  | "none"
  | "attributedUserId"
  | "ownerUserId"
  | "branchId";

export type KpiGrain = "total" | "day" | "week" | "month";

export type KpiFormulaKey =
  | "sum_canonical_snapshot_amount"
  | "count_canonical_snapshots"
  | "sum_canonical_snapshot_amount_by_owner"
  | "count_pending_snapshots"
  | "count_leads_created"
  | "count_leads_owned"
  | "count_owner_assignment_events"
  | "count_crm_converted_events";

export type KpiKey =
  | "attributed_revenue_rials"
  | "attributed_conversion_count"
  | "attributed_revenue_by_owner"
  | "pending_attribution_count"
  | "leads_created_count"
  | "leads_owned_count"
  | "owner_assignment_events"
  | "crm_converted_events";

export type KpiDefinition = {
  key: KpiKey;
  titleFa: string;
  descriptionFa: string;
  unit: KpiUnit;
  sources: readonly KpiSource[];
  formulaKey: KpiFormulaKey;
  allowedDimensions: readonly KpiDimension[];
  allowedGrains: readonly KpiGrain[];
};

export type KpiSeriesPoint = {
  bucketStart: string; // ISO UTC
  dimensions: Record<string, string | null>;
  value: number;
};

export type KpiComputeQuery = {
  organizationId: string;
  keys: readonly KpiKey[];
  from: Date;
  to: Date;
  grain: KpiGrain;
  dimension: KpiDimension;
  /** Restrict to these branches; undefined = all visible to caller. */
  branchIds?: readonly string[];
  ttlSeconds?: number;
};

export type KpiResultBundle = {
  organizationId: string;
  from: string;
  to: string;
  grain: KpiGrain;
  dimension: KpiDimension;
  cache: { hit: boolean; expiresAt?: string };
  results: Record<
    string,
    {
      unit: KpiUnit;
      points: KpiSeriesPoint[];
    }
  >;
};

/** Optional Truth Spine filters for report adoption (does not change default KPI keys). */
export type KpiLeadScope = {
  source?: string;
  sourceType?: string;
  formId?: string;
  stageId?: string;
  /** When set, only leads currently owned by these users. */
  ownerUserIds?: readonly string[];
};

export type FormulaContext = {
  organizationId: string;
  from: Date;
  to: Date;
  grain: KpiGrain;
  dimension: KpiDimension;
  branchIds?: readonly string[];
  leadScope?: KpiLeadScope;
  /** When set, CrmActivity formulas/sources restrict to these actors. */
  actorUserIds?: readonly string[];
};

export type FormulaFn = (ctx: FormulaContext) => Promise<KpiSeriesPoint[]>;

export const MAX_KPI_RANGE_MS = 366 * 24 * 60 * 60 * 1000;
export const DEFAULT_KPI_TTL_SECONDS = 300;
export const MIN_KPI_TTL_SECONDS = 30;
export const MAX_KPI_TTL_SECONDS = 900;
