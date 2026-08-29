/**
 * Sprint 4 — Operational Queue Engine unit tests (no DB).
 */

import assert from "node:assert/strict";
import { listOpsQueueCatalog } from "../lib/ops/catalog";
import { isOpsQueueId } from "../lib/ops/list";
import {
  compareQueueItems,
  scoreBandPriority,
  sortQueueItems,
  taskPriorityToOps,
} from "../lib/ops/priority";
import {
  evaluateFirstContactSla,
  evaluateFollowUpSla,
} from "../lib/ops/sla-policy";
import type { OperationalQueueItem } from "../lib/ops/types";

function test(name: string, fn: () => void) {
  fn();
  console.log(`✓ ${name}`);
}

test("queue catalog covers all five queues", () => {
  const ids = listOpsQueueCatalog().map((q) => q.queueId);
  assert.deepEqual(ids.sort(), [
    "ASSIGNMENT",
    "CALL",
    "ESCALATION",
    "FOLLOW_UP",
    "SLA",
  ]);
});

test("isOpsQueueId validates ids", () => {
  assert.equal(isOpsQueueId("ASSIGNMENT"), true);
  assert.equal(isOpsQueueId("WEIGHTED"), false);
});

test("priority helpers map score and task priority", () => {
  assert.equal(scoreBandPriority("HOT"), "HIGH");
  assert.equal(taskPriorityToOps("URGENT"), "URGENT");
  assert.equal(taskPriorityToOps("NORMAL"), "NORMAL");
});

test("SLA first-contact evaluation uses policy hours", () => {
  const createdAt = new Date("2026-07-01T00:00:00.000Z");
  const policy = {
    firstContactHours: 24,
    followUpGraceHours: 0,
    registrationNeedsCallHours: 48,
  };
  assert.equal(
    evaluateFirstContactSla({
      createdAt,
      lastContactAt: new Date("2026-07-01T01:00:00.000Z"),
      policy,
      now: new Date("2026-07-02T00:00:00.000Z"),
    }),
    "OK",
  );
  assert.equal(
    evaluateFirstContactSla({
      createdAt,
      lastContactAt: null,
      policy,
      now: new Date("2026-07-02T01:00:00.000Z"),
    }),
    "BREACHED",
  );
  assert.equal(
    evaluateFirstContactSla({
      createdAt,
      lastContactAt: null,
      policy,
      now: new Date("2026-07-01T20:00:00.000Z"),
    }),
    "AT_RISK",
  );
});

test("SLA follow-up evaluation respects grace", () => {
  const dueAt = new Date("2026-07-01T12:00:00.000Z");
  const policy = {
    firstContactHours: 24,
    followUpGraceHours: 2,
    registrationNeedsCallHours: 48,
  };
  assert.equal(
    evaluateFollowUpSla({
      dueAt,
      policy,
      now: new Date("2026-07-01T13:00:00.000Z"),
    }),
    "AT_RISK",
  );
  assert.equal(
    evaluateFollowUpSla({
      dueAt,
      policy,
      now: new Date("2026-07-01T15:00:00.000Z"),
    }),
    "BREACHED",
  );
});

test("queue sort ranks escalated and breached first", () => {
  const mk = (
    partial: Partial<OperationalQueueItem>,
  ): OperationalQueueItem => ({
    queueId: "SLA",
    entityType: "LEAD",
    entityId: "x",
    organizationId: "org",
    ownerUserId: null,
    priority: "NORMAL",
    dueAt: "2026-07-01T00:00:00.000Z",
    slaState: "OK",
    createdAt: "2026-06-01T00:00:00.000Z",
    metadata: {},
    ...partial,
  });
  const items = sortQueueItems([
    mk({ entityId: "a", slaState: "OK", priority: "HIGH" }),
    mk({
      entityId: "b",
      slaState: "BREACHED",
      priority: "LOW",
      metadata: { escalated: true },
    }),
    mk({ entityId: "c", slaState: "BREACHED", priority: "NORMAL" }),
  ]);
  assert.equal(items[0]!.entityId, "b");
  assert.equal(items[1]!.entityId, "c");
  assert.ok(compareQueueItems(items[0]!, items[1]!) <= 0);
});

test("OperationalQueueItem required fields are present on sample", () => {
  const item: OperationalQueueItem = {
    queueId: "ASSIGNMENT",
    entityType: "LEAD",
    entityId: "lead1",
    organizationId: "org1",
    ownerUserId: null,
    priority: "NORMAL",
    dueAt: null,
    slaState: "OK",
    createdAt: new Date(0).toISOString(),
    metadata: {},
  };
  for (const key of [
    "queueId",
    "entityType",
    "entityId",
    "organizationId",
    "ownerUserId",
    "priority",
    "dueAt",
    "slaState",
    "createdAt",
    "metadata",
  ] as const) {
    assert.ok(key in item);
  }
});

console.log("\nAll ops queue unit tests passed.");
