/**
 * Pure CRM smoke tests (no database).
 * Run: npm run test:crm-smoke
 */

import assert from "node:assert/strict";
import {
  AUTOMATION_ACTION_TYPES,
  AUTOMATION_PRESETS,
  parseAutomationActionConfig,
  parseAutomationConditions,
  validateAutomationActionConfig,
} from "../lib/crm/automation-contract";
import {
  calculateLeadScore,
  clampScore,
  scoreBandFromScore,
} from "../lib/crm/scoring";
import { DEFAULT_STAGES, stageTypeToLeadStatus } from "../lib/crm/pipeline";
import { isTaskOverdue, displayTaskStatus } from "../lib/crm/tasks";
import { CrmStageType, CrmTaskStatus, LeadStatus } from "../generated/prisma/enums";
import { parseFormCrmSettings } from "../lib/crm/form-crm-settings";
import { validateManualLeadIntake } from "../lib/crm/create-manual-lead";
import { evaluateTerminalConfirmation } from "../lib/crm/stage-transition";

let passed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("0. CrmStageType runtime enum from generated/prisma/enums", () => {
  assert.equal(typeof CrmStageType, "object");
  assert.notEqual(CrmStageType, null);
  assert.equal(CrmStageType.NEW, "NEW");
  assert.equal(CrmStageType.WON, "WON");
  assert.equal(CrmStageType.LOST, "LOST");
});

test("1. default pipeline stage ordering", () => {
  const positions = DEFAULT_STAGES.map((s) => s.position);
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.equal(DEFAULT_STAGES.length, 8);
});

test("2. stageType → LeadStatus mapping", () => {
  assert.equal(stageTypeToLeadStatus(CrmStageType.NEW), LeadStatus.NEW);
  assert.equal(stageTypeToLeadStatus(CrmStageType.WON), LeadStatus.ENROLLED);
  assert.equal(stageTypeToLeadStatus(CrmStageType.LOST), LeadStatus.LOST);
});

test("3. terminal stage flags", () => {
  const won = DEFAULT_STAGES.find((s) => s.code === "won");
  const lost = DEFAULT_STAGES.find((s) => s.code === "lost");
  assert.equal(won?.isTerminal, true);
  assert.equal(won?.isWon, true);
  assert.equal(lost?.isLost, true);
});

test("4. action allowlist rejects arbitrary code", () => {
  const err = validateAutomationActionConfig({
    actions: [{ type: "DROP_TABLE" }],
  });
  assert.ok(err);
  assert.ok(AUTOMATION_ACTION_TYPES.includes("CREATE_TASK"));
});

test("5. parse conditions + actions", () => {
  const conditions = parseAutomationConditions({
    scoreMin: 10,
    scoreMax: 90,
    hasBooking: true,
  });
  assert.equal(conditions.scoreMin, 10);
  assert.equal(conditions.hasBooking, true);
  const actions = parseAutomationActionConfig({
    actions: [
      { type: "CREATE_TASK", title: "تماس", dueMinutes: 30 },
      { type: "ENQUEUE_SMS", templateCode: "x" },
      { type: "EVAL", code: "evil()" },
    ],
  });
  assert.equal(actions.actions.length, 2);
});

test("6. presets are templates only", () => {
  assert.ok(AUTOMATION_PRESETS.length >= 4);
  assert.ok(AUTOMATION_PRESETS.every((p) => p.name && p.trigger));
});

test("7. score calculation + clamp + bands", () => {
  const result = calculateLeadScore({
    hasValidMobile: true,
    hasValidEmail: true,
    hasNationalId: true,
    consultationRequested: true,
    bookingCreated: true,
    bookingCompleted: false,
    hasOverdueTask: false,
  });
  assert.ok(result.score >= 0 && result.score <= 100);
  assert.ok(result.breakdown.length >= 4);
  assert.equal(clampScore(150), 100);
  assert.equal(clampScore(-5), 0);
  assert.equal(scoreBandFromScore(85), "QUALIFIED");
  assert.equal(scoreBandFromScore(10), "COLD");
});

test("8. score breakdown stable for same signals", () => {
  const a = calculateLeadScore({
    hasValidMobile: true,
    hasValidEmail: false,
    hasNationalId: false,
    consultationRequested: false,
    bookingCreated: false,
    bookingCompleted: false,
    hasOverdueTask: true,
  });
  const b = calculateLeadScore({
    hasValidMobile: true,
    hasValidEmail: false,
    hasNationalId: false,
    consultationRequested: false,
    bookingCreated: false,
    bookingCompleted: false,
    hasOverdueTask: true,
  });
  assert.deepEqual(a, b);
});

test("9. overdue derivation", () => {
  assert.equal(
    isTaskOverdue({
      status: CrmTaskStatus.OPEN,
      dueAt: new Date(Date.now() - 1000),
    }),
    true,
  );
  assert.equal(
    displayTaskStatus(CrmTaskStatus.COMPLETED, new Date(Date.now() - 1000)),
    CrmTaskStatus.COMPLETED,
  );
});

test("10. form CRM settings defaults", () => {
  const settings = parseFormCrmSettings({});
  assert.equal(settings.createLeadOnSubmit, false);
  const enabled = parseFormCrmSettings(
    {},
    { createLeadOnSubmit: true, leadSource: "PRE_REG" },
  );
  assert.equal(enabled.createLeadOnSubmit, true);
  assert.equal(enabled.leadSourceLabel, "PRE_REG");
});

test("11. manual intake normalizes Persian mobile and defaults", () => {
  const now = new Date("2026-07-17T00:00:00.000Z");
  const result = validateManualLeadIntake(
    {
      firstName: "  علی  ",
      lastName: " رضایی ",
      mobile: "۰۹۱۲ ۱۲۳ ۴۵۶۷",
      branchId: "branch-1",
      source: "",
      ownerUserId: "",
      notes: "  تماس ورودی  ",
      createFollowUpTask: true,
      followUpDueAt: "",
      idempotencyKey: "manual-test-1",
    },
    now,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.mobile, "09121234567");
  assert.equal(result.data.source, "MANUAL");
  assert.equal(
    result.data.followUpDueAt?.toISOString(),
    "2026-07-18T00:00:00.000Z",
  );
});

test("12. manual intake rejects malformed phone and past follow-up", () => {
  const result = validateManualLeadIntake(
    {
      firstName: "علی",
      lastName: "رضایی",
      mobile: "abc09121234567",
      branchId: "branch-1",
      source: "CALL",
      ownerUserId: "",
      notes: "",
      createFollowUpTask: true,
      followUpDueAt: "2026-07-16T00:00:00.000Z",
      idempotencyKey: "manual-test-2",
    },
    new Date("2026-07-17T00:00:00.000Z"),
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.fieldErrors.mobile);
  assert.ok(result.fieldErrors.followUpDueAt);
});

test("13. WON and LOST transitions return typed confirmation requirements", () => {
  const won = evaluateTerminalConfirmation(
    { isTerminal: true, stageType: CrmStageType.WON },
    false,
  );
  assert.deepEqual(won, {
    ok: false,
    requiresConfirmation: true,
    terminalStatus: "WON",
  });
  const lost = evaluateTerminalConfirmation(
    { isTerminal: true, stageType: CrmStageType.LOST },
    false,
  );
  assert.deepEqual(lost, {
    ok: false,
    requiresConfirmation: true,
    terminalStatus: "LOST",
  });
});

test("14. confirmed terminal transitions proceed without throwing", () => {
  assert.deepEqual(
    evaluateTerminalConfirmation(
      { isTerminal: true, stageType: CrmStageType.WON },
      true,
    ),
    { ok: true, terminalStatus: "WON" },
  );
  assert.deepEqual(
    evaluateTerminalConfirmation(
      { isTerminal: true, stageType: CrmStageType.LOST },
      true,
    ),
    { ok: true, terminalStatus: "LOST" },
  );
});

test("15. cancelling confirmation has no transition decision", () => {
  const request = evaluateTerminalConfirmation(
    { isTerminal: true, stageType: CrmStageType.WON },
    false,
  );
  assert.equal(request.ok, false);
  assert.equal("requiresConfirmation" in request && request.requiresConfirmation, true);
});

test("16. invalid terminal stage type is rejected", () => {
  const invalid = evaluateTerminalConfirmation(
    { isTerminal: true, stageType: CrmStageType.NEW },
    false,
  );
  assert.equal(invalid.ok, false);
  assert.equal(
    "requiresConfirmation" in invalid && invalid.requiresConfirmation,
    false,
  );
});

console.log(`\nAll ${passed} CRM smoke tests passed.`);
