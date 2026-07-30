/**
 * Sprint 5 Automation Engine — unit tests (no DB).
 * Run: npm run test:automation
 */

import assert from "node:assert/strict";
import { DomainEventType } from "../generated/prisma/enums";
import { AUTOMATION_EVENT_CATALOG } from "../lib/automation/catalog";
import { isAutomationClockCutoverEnabled } from "../lib/automation/cutover";
import {
  AUTOMATION_ACTION_TYPES,
  AUTOMATION_PRESETS,
  actionIdempotencyKey,
  isKnownDomainEventType,
  parseAutomationActionConfig,
  parseAutomationConditions,
  validateAutomationActionConfig,
} from "../lib/automation/rules/contract";
import {
  isAliasOfLeadCreated,
  ruleTriggersForEvent,
} from "../lib/automation/triggers/aliases";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("catalog covers Sprint 5 events", () => {
  const types = new Set(AUTOMATION_EVENT_CATALOG.map((e) => e.eventType));
  for (const required of [
    DomainEventType.LEAD_CREATED,
    DomainEventType.LEAD_ASSIGNED,
    DomainEventType.LEAD_REASSIGNED,
    DomainEventType.FOLLOWUP_DUE,
    DomainEventType.CALL_LOGGED,
    DomainEventType.REGISTRATION_CREATED,
    DomainEventType.PAYMENT_SUCCESS,
    DomainEventType.PAYMENT_FAILED,
    DomainEventType.SLA_BREACHED,
    DomainEventType.QUEUE_ITEM_ESCALATED,
  ]) {
    assert.ok(types.has(required), `missing ${required}`);
  }
});

test("FORM_LEAD_CREATED aliases to LEAD_CREATED trigger", () => {
  const triggers = ruleTriggersForEvent(DomainEventType.FORM_LEAD_CREATED);
  assert.deepEqual(triggers, [
    DomainEventType.FORM_LEAD_CREATED,
    DomainEventType.LEAD_CREATED,
  ]);
  assert.equal(isAliasOfLeadCreated(DomainEventType.FORM_LEAD_CREATED), true);
  assert.deepEqual(ruleTriggersForEvent(DomainEventType.PAYMENT_SUCCESS), [
    DomainEventType.PAYMENT_SUCCESS,
  ]);
});

test("parse conditions includes Sprint 5 fields", () => {
  const c = parseAutomationConditions({
    sourceTypes: ["INSTAGRAM"],
    ownerIsNull: true,
    slaStateIn: ["BREACHED"],
    answerEquals: { grade: "10" },
    metadataEquals: { reason: "SLA_BREACH" },
  });
  assert.deepEqual(c.sourceTypes, ["INSTAGRAM"]);
  assert.equal(c.ownerIsNull, true);
  assert.deepEqual(c.slaStateIn, ["BREACHED"]);
  assert.equal(c.answerEquals?.grade, "10");
  assert.equal(c.metadataEquals?.reason, "SLA_BREACH");
});

test("action allowlist includes new Sprint 5 actions", () => {
  for (const type of [
    "DISPATCH_OWNER",
    "NOTIFY_USER",
    "OPEN_ESCALATION",
    "ESCALATE_REASSIGN",
    "ENQUEUE_DELAYED_EVENT",
  ] as const) {
    assert.ok(AUTOMATION_ACTION_TYPES.includes(type));
  }
  const cfg = parseAutomationActionConfig({
    actions: [
      { type: "ASSIGN_OWNER", userId: "u1" },
      { type: "DISPATCH_OWNER", candidateUserIds: ["a", "b"] },
      {
        type: "NOTIFY_USER",
        userId: "mgr",
        title: "SLA",
      },
      { type: "OPEN_ESCALATION", reason: "SLA_BREACH", queueId: "SLA" },
      {
        type: "ESCALATE_REASSIGN",
        newOwnerUserId: "u2",
        reason: "escalate",
      },
      {
        type: "ENQUEUE_DELAYED_EVENT",
        eventType: "FOLLOWUP_DUE",
        delayMinutes: 60,
      },
      { type: "HACK_SHELL", cmd: "rm" },
    ],
  });
  assert.equal(cfg.actions.length, 6);
  assert.equal(
    validateAutomationActionConfig({ actions: [{ type: "HACK_SHELL" }] }),
    "اکشن غیرمجاز: HACK_SHELL",
  );
});

test("idempotency key is stable", () => {
  const a = actionIdempotencyKey({
    ruleId: "r1",
    eventId: "e1",
    actionIndex: 0,
    actionType: "ASSIGN_OWNER",
  });
  const b = actionIdempotencyKey({
    ruleId: "r1",
    eventId: "e1",
    actionIndex: 0,
    actionType: "ASSIGN_OWNER",
  });
  assert.equal(a, b);
  assert.equal(a, "auto:r1:e1:0:ASSIGN_OWNER");
});

test("ASSIGN_OWNER is the ownership action (setLeadOwner gateway)", () => {
  const cfg = parseAutomationActionConfig({
    actions: [{ type: "ASSIGN_OWNER", userId: "owner-1" }],
  });
  assert.equal(cfg.actions[0]?.type, "ASSIGN_OWNER");
  assert.ok(
    !AUTOMATION_ACTION_TYPES.includes(
      "UPDATE_OWNER_DIRECT" as (typeof AUTOMATION_ACTION_TYPES)[number],
    ),
  );
});

test("presets include SLA and follow-up cutover templates", () => {
  const codes = new Set(AUTOMATION_PRESETS.map((p) => p.code));
  assert.ok(codes.has("sla_breach_urgent"));
  assert.ok(codes.has("followup_due_task"));
  assert.ok(codes.has("instagram_lead_dispatch"));
});

test("isKnownDomainEventType accepts new catalog", () => {
  assert.equal(isKnownDomainEventType("LEAD_CREATED"), true);
  assert.equal(isKnownDomainEventType("SLA_BREACHED"), true);
  assert.equal(isKnownDomainEventType("NOT_A_REAL_EVENT"), false);
});

test("clock cutover reads env (Phase C default ON)", () => {
  const prev = process.env.STAROS_AUTOMATION_CLOCK_CUTOVER;
  delete process.env.STAROS_AUTOMATION_CLOCK_CUTOVER;
  assert.equal(isAutomationClockCutoverEnabled(), true);
  process.env.STAROS_AUTOMATION_CLOCK_CUTOVER = "0";
  assert.equal(isAutomationClockCutoverEnabled(), false);
  process.env.STAROS_AUTOMATION_CLOCK_CUTOVER = "1";
  assert.equal(isAutomationClockCutoverEnabled(), true);
  if (prev === undefined) delete process.env.STAROS_AUTOMATION_CLOCK_CUTOVER;
  else process.env.STAROS_AUTOMATION_CLOCK_CUTOVER = prev;
});

console.log("\nAll automation unit tests passed.");
