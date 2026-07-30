/**
 * Sprint 3 — KPI Computation Engine unit tests (no DB).
 */

import assert from "node:assert/strict";
import {
  aggregateEvents,
  bucketStartForGrain,
} from "../lib/kpi/aggregation";
import { buildKpiCacheKey, clampKpiTtlSeconds } from "../lib/kpi/cache";
import {
  assertKpiQuery,
  isKpiDimension,
  isKpiGrain,
  KpiComputeError,
  parseKpiKeys,
} from "../lib/kpi/compute";
import { FORMULA_REGISTRY } from "../lib/kpi/formulas";
import {
  kpiPointsByUserId,
  sumKpiPoints,
} from "../lib/kpi/run-formula";
import { getKpiDefinition, isKpiKey, listKpiCatalog } from "../lib/kpi/registry";
import { selectCanonicalSnapshotsForKpi } from "../lib/crm/attribution-revenue-contract";
import {
  paymentIntentRevenueKey,
  registrationWaivedRevenueKey,
} from "../lib/crm/attribution-revenue-contract";

function test(name: string, fn: () => void) {
  fn();
  console.log(`✓ ${name}`);
}

test("KPI catalog exposes all planned keys", () => {
  const keys = listKpiCatalog().map((d) => d.key);
  for (const key of [
    "attributed_revenue_rials",
    "attributed_conversion_count",
    "attributed_revenue_by_owner",
    "pending_attribution_count",
    "leads_created_count",
    "leads_owned_count",
    "owner_assignment_events",
    "crm_converted_events",
  ]) {
    assert.equal(isKpiKey(key), true);
    assert.ok(keys.includes(key as (typeof keys)[number]));
  }
});

test("every registry formulaKey exists in formula registry", () => {
  for (const def of listKpiCatalog()) {
    assert.equal(typeof FORMULA_REGISTRY[def.formulaKey], "function");
  }
});

test("financial KPIs declare SNAPSHOTS source only", () => {
  for (const key of [
    "attributed_revenue_rials",
    "attributed_conversion_count",
    "attributed_revenue_by_owner",
  ] as const) {
    const def = getKpiDefinition(key)!;
    assert.deepEqual([...def.sources], ["SNAPSHOTS"]);
  }
});

test("UTC day / week / month bucket starts", () => {
  const d = new Date("2026-07-15T15:30:00.000Z"); // Wednesday
  assert.equal(
    bucketStartForGrain(d, "day").toISOString(),
    "2026-07-15T00:00:00.000Z",
  );
  assert.equal(
    bucketStartForGrain(d, "week").toISOString(),
    "2026-07-13T00:00:00.000Z",
  );
  assert.equal(
    bucketStartForGrain(d, "month").toISOString(),
    "2026-07-01T00:00:00.000Z",
  );
  assert.equal(
    bucketStartForGrain(d, "total").toISOString(),
    "1970-01-01T00:00:00.000Z",
  );
});

test("aggregateEvents sums by bucket and dimension", () => {
  const points = aggregateEvents(
    [
      {
        at: new Date("2026-07-01T10:00:00.000Z"),
        value: 100,
        dimensions: { attributedUserId: "a" },
      },
      {
        at: new Date("2026-07-01T12:00:00.000Z"),
        value: 50,
        dimensions: { attributedUserId: "a" },
      },
      {
        at: new Date("2026-07-02T12:00:00.000Z"),
        value: 25,
        dimensions: { attributedUserId: "b" },
      },
    ],
    "day",
    "attributedUserId",
  );
  assert.equal(points.length, 2);
  const day1 = points.find((p) => p.dimensions.attributedUserId === "a")!;
  assert.equal(day1.value, 150);
  assert.equal(day1.bucketStart, "2026-07-01T00:00:00.000Z");
});

test("canonical revenue contract used for KPI selection", () => {
  const reg = "reg_kpi";
  const selected = selectCanonicalSnapshotsForKpi([
    {
      id: "w",
      revenueKey: registrationWaivedRevenueKey(reg),
      registrationId: reg,
      amountRials: 0,
      status: "ATTRIBUTED",
    },
    {
      id: "p",
      revenueKey: paymentIntentRevenueKey("pi_1"),
      registrationId: reg,
      amountRials: 9_000_000,
      status: "ATTRIBUTED",
    },
  ]);
  assert.equal(selected.length, 1);
  assert.equal(selected[0]!.id, "p");
});

test("parseKpiKeys rejects unknown keys", () => {
  assert.throws(
    () => parseKpiKeys("not_a_real_kpi"),
    (err: unknown) =>
      err instanceof KpiComputeError && err.code === "INVALID_KEY",
  );
  assert.deepEqual(parseKpiKeys("leads_created_count"), ["leads_created_count"]);
});

test("assertKpiQuery enforces grain/dimension and range", () => {
  const base = {
    organizationId: "org",
    keys: ["leads_owned_count" as const],
    from: new Date("2026-01-01T00:00:00.000Z"),
    to: new Date("2026-01-31T00:00:00.000Z"),
    grain: "total" as const,
    dimension: "none" as const,
  };
  assert.doesNotThrow(() => assertKpiQuery(base));
  assert.throws(
    () => assertKpiQuery({ ...base, grain: "day" }),
    (err: unknown) =>
      err instanceof KpiComputeError && err.code === "INVALID_GRAIN",
  );
  assert.throws(
    () =>
      assertKpiQuery({
        ...base,
        keys: ["attributed_revenue_rials"],
        from: new Date("2020-01-01T00:00:00.000Z"),
        to: new Date("2026-01-01T00:00:00.000Z"),
      }),
    (err: unknown) =>
      err instanceof KpiComputeError && err.code === "INVALID_RANGE",
  );
});

test("adoption helpers map series points for reports", () => {
  const points = [
    {
      bucketStart: "1970-01-01T00:00:00.000Z",
      dimensions: { ownerUserId: "u1" },
      value: 3,
    },
    {
      bucketStart: "1970-01-01T00:00:00.000Z",
      dimensions: { ownerUserId: "u2" },
      value: 5,
    },
  ];
  assert.equal(sumKpiPoints(points), 8);
  const byOwner = kpiPointsByUserId(points, "ownerUserId");
  assert.equal(byOwner.get("u1"), 3);
  assert.equal(byOwner.get("u2"), 5);
});

test("cache key is stable under key reorder", () => {
  const a = buildKpiCacheKey({
    organizationId: "org",
    keys: ["b", "a"],
    from: "2026-01-01T00:00:00.000Z",
    to: "2026-01-31T00:00:00.000Z",
    grain: "total",
    dimension: "none",
  });
  const b = buildKpiCacheKey({
    organizationId: "org",
    keys: ["a", "b"],
    from: "2026-01-01T00:00:00.000Z",
    to: "2026-01-31T00:00:00.000Z",
    grain: "total",
    dimension: "none",
  });
  assert.equal(a, b);
  assert.equal(clampKpiTtlSeconds(10), 30);
  assert.equal(clampKpiTtlSeconds(5000), 900);
  assert.equal(isKpiGrain("week"), true);
  assert.equal(isKpiDimension("branchId"), true);
});

console.log("\nAll KPI unit tests passed.");
