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

console.log(`\nAll ${passed} CRM smoke tests passed.`);
