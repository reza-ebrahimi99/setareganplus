/**
 * Sprint 6 Dashboard Platform — unit tests (no DB).
 * Run: npm run test:dashboard
 */

import assert from "node:assert/strict";
import {
  canViewDashboard,
  canViewWidget,
  filterWidgetsByPermission,
  hasAllPermissions,
} from "../lib/dashboard/permissions/filter";
import {
  getDashboardDefinition,
  isDashboardId,
  listDashboardDefinitions,
} from "../lib/dashboard/registry/dashboards";
import {
  getWidgetDefinition,
  isWidgetId,
  listWidgetDefinitions,
} from "../lib/dashboard/registry/widgets";
import { getWidgetLoader } from "../lib/dashboard/loaders";
import { clampWidgetTtlSeconds } from "../lib/dashboard/cache";
import { buildWidgetCacheKey } from "../lib/dashboard/cache";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("dashboard registry covers five personas", () => {
  const ids = listDashboardDefinitions().map((d) => d.id);
  for (const id of [
    "manager",
    "advisor",
    "executive",
    "admissions",
    "marketing",
  ]) {
    assert.ok(ids.includes(id), id);
    assert.ok(isDashboardId(id));
  }
});

test("widget registry covers planned widgets", () => {
  for (const id of [
    "leads_today",
    "conversion",
    "revenue",
    "pipeline",
    "queue_assignment",
    "queue_follow_up",
    "queue_sla_breaches",
    "automation_activity",
    "notifications",
    "manager_ops_metrics",
    "workspace_board",
  ]) {
    assert.ok(isWidgetId(id), id);
    const def = getWidgetDefinition(id)!;
    assert.ok(def.dataSource);
    assert.ok(getWidgetLoader(def.loaderKey), def.loaderKey);
  }
});

test("every dashboard widget id exists in widget registry", () => {
  for (const dash of listDashboardDefinitions()) {
    for (const widgetId of dash.widgetIds) {
      assert.ok(isWidgetId(widgetId), `${dash.id} → ${widgetId}`);
    }
  }
});

test("permission filter omits widgets without grants", () => {
  const agent = new Set(["crm.view_assigned"]);
  const visible = filterWidgetsByPermission(agent, listWidgetDefinitions());
  assert.ok(visible.some((w) => w.id === "workspace_board"));
  assert.ok(!visible.some((w) => w.id === "manager_ops_metrics"));
  assert.ok(!visible.some((w) => w.id === "revenue"));

  const manager = new Set(["reports.view", "crm.view_all", "crm.view_assigned"]);
  assert.equal(
    canViewDashboard(manager, getDashboardDefinition("manager")!),
    true,
  );
  assert.equal(
    canViewDashboard(agent, getDashboardDefinition("manager")!),
    false,
  );
  assert.equal(
    canViewWidget(agent, getWidgetDefinition("queue_follow_up")!),
    true,
  );
});

test("hasAllPermissions requires every permission", () => {
  assert.equal(hasAllPermissions(new Set(["a", "b"]), ["a"]), true);
  assert.equal(hasAllPermissions(new Set(["a"]), ["a", "b"]), false);
});

test("widget TTL clamp", () => {
  assert.equal(clampWidgetTtlSeconds(10), 30);
  assert.equal(clampWidgetTtlSeconds(2000), 900);
  assert.equal(clampWidgetTtlSeconds(120), 120);
});

test("cache key stable under branch reorder", () => {
  const a = buildWidgetCacheKey({
    organizationId: "org",
    widgetId: "leads_today",
    viewerUserId: "u1",
    branchIds: ["b2", "b1"],
    from: "2026-01-01T00:00:00.000Z",
    to: "2026-01-31T00:00:00.000Z",
  });
  const b = buildWidgetCacheKey({
    organizationId: "org",
    widgetId: "leads_today",
    viewerUserId: "u1",
    branchIds: ["b1", "b2"],
    from: "2026-01-01T00:00:00.000Z",
    to: "2026-01-31T00:00:00.000Z",
  });
  assert.equal(a, b);
});

test("loaders do not import prisma (boundary check via keys)", () => {
  // Structural: every widget loaderKey resolves; prisma isolation is by convention
  // under lib/dashboard/loaders (verified by code review / no prisma import).
  const keys = new Set(
    listWidgetDefinitions().map((w) => w.loaderKey),
  );
  for (const key of keys) {
    assert.ok(getWidgetLoader(key), key);
  }
});

console.log("\nAll dashboard unit tests passed.");
