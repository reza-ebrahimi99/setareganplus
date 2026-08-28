/**
 * Sprint 6.6 — Production Hardening unit tests (no DB).
 * Run: npm run test:hardening
 */

import assert from "node:assert/strict";
import { DomainEventType } from "../generated/prisma/enums";
import { isAutomationClockCutoverEnabled } from "../lib/automation/cutover";
import {
  isAutomationOwnershipEcho,
  isOwnershipMutatingAction,
} from "../lib/automation/loop-guard";
import {
  AUTOMATION_CIRCUIT_TRIP_LIMIT,
  AUTOMATION_CIRCUIT_WINDOW_MS,
  AUTOMATION_REASSIGN_RATE_LIMIT,
  AUTOMATION_REASSIGN_RATE_WINDOW_MS,
  MAX_EVENT_ATTEMPTS,
  OUTBOX_PROCESSING_LEASE_MS,
} from "../lib/automation/types";
import { clampClaimTtlMs } from "../lib/ops/claims";
import {
  DEFAULT_CLAIM_TTL_MS,
  MAX_CLAIM_TTL_MS,
  MIN_CLAIM_TTL_MS,
} from "../lib/ops/types";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("clock cutover defaults ON (Phase C)", () => {
  const prev = process.env.STAROS_AUTOMATION_CLOCK_CUTOVER;
  delete process.env.STAROS_AUTOMATION_CLOCK_CUTOVER;
  assert.equal(isAutomationClockCutoverEnabled(), true);
  process.env.STAROS_AUTOMATION_CLOCK_CUTOVER = "0";
  assert.equal(isAutomationClockCutoverEnabled(), false);
  process.env.STAROS_AUTOMATION_CLOCK_CUTOVER = "false";
  assert.equal(isAutomationClockCutoverEnabled(), false);
  process.env.STAROS_AUTOMATION_CLOCK_CUTOVER = "1";
  assert.equal(isAutomationClockCutoverEnabled(), true);
  if (prev === undefined) delete process.env.STAROS_AUTOMATION_CLOCK_CUTOVER;
  else process.env.STAROS_AUTOMATION_CLOCK_CUTOVER = prev;
});

test("claim TTL is clamped", () => {
  assert.equal(clampClaimTtlMs(undefined), DEFAULT_CLAIM_TTL_MS);
  assert.equal(clampClaimTtlMs(100), MIN_CLAIM_TTL_MS);
  assert.equal(clampClaimTtlMs(999_999_999), MAX_CLAIM_TTL_MS);
  assert.equal(clampClaimTtlMs(60_000), 60_000);
});

test("loop guard detects automation ownership echo", () => {
  assert.equal(
    isAutomationOwnershipEcho({
      eventType: DomainEventType.LEAD_REASSIGNED,
      eventPayload: { ownershipSource: "AUTOMATION" },
    }),
    true,
  );
  assert.equal(
    isAutomationOwnershipEcho({
      eventType: DomainEventType.LEAD_ASSIGNED,
      eventPayload: { source: "MANUAL" },
    }),
    false,
  );
  assert.equal(
    isAutomationOwnershipEcho({
      eventType: DomainEventType.FOLLOWUP_DUE,
      eventPayload: { ownershipSource: "AUTOMATION" },
    }),
    false,
  );
  assert.equal(isOwnershipMutatingAction("ASSIGN_OWNER"), true);
  assert.equal(isOwnershipMutatingAction("CREATE_TASK"), false);
});

test("outbox lease and attempt constants are production-safe", () => {
  assert.ok(OUTBOX_PROCESSING_LEASE_MS >= 60_000);
  assert.ok(MAX_EVENT_ATTEMPTS >= 3);
});

test("loop rate limit sits under circuit breaker trip", () => {
  assert.ok(AUTOMATION_REASSIGN_RATE_LIMIT < AUTOMATION_CIRCUIT_TRIP_LIMIT);
  assert.ok(
    AUTOMATION_REASSIGN_RATE_WINDOW_MS < AUTOMATION_CIRCUIT_WINDOW_MS,
  );
});

console.log("\nAll production hardening unit tests passed.");
