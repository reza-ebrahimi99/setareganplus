/**
 * Unit tests: RegistrationFlowStep.enabled → public wizard plan.
 * Run: npx tsx scripts/registration-wizard-plan-unit-tests.ts
 *   or: npm run test:registration-wizard-plan
 */

import assert from "node:assert/strict";
import {
  RegistrationFlowStepKey,
  RegistrationProductType,
} from "../generated/prisma/enums";
import {
  buildWizardPlan,
  defaultFlowStepsForProductType,
  LEGACY_WIZARD_PANELS,
  type FlowStepLike,
} from "../lib/registration/wizard-plan";

let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

test("commerce lite BOOK disables APPLICANT/STUDENT/DOCUMENTS by default", () => {
  const steps = defaultFlowStepsForProductType(RegistrationProductType.BOOK);
  const byKey = Object.fromEntries(steps.map((s) => [s.stepKey, s.enabled]));

  assert.equal(byKey[RegistrationFlowStepKey.APPLICANT], false);
  assert.equal(byKey[RegistrationFlowStepKey.STUDENT], false);
  assert.equal(byKey[RegistrationFlowStepKey.DOCUMENTS], false);
  assert.equal(byKey[RegistrationFlowStepKey.FORM], true);
  assert.equal(byKey[RegistrationFlowStepKey.PAYMENT], true);
  assert.equal(byKey[RegistrationFlowStepKey.REVIEW], true);
  assert.equal(byKey[RegistrationFlowStepKey.CONFIRMATION], true);
});

test("buildWizardPlan filters enabled only", () => {
  const flowSteps: FlowStepLike[] = [
    {
      stepKey: RegistrationFlowStepKey.STUDENT,
      label: "دانش‌آموز",
      enabled: true,
      sortOrder: 0,
    },
    {
      stepKey: RegistrationFlowStepKey.APPLICANT,
      label: "ولی",
      enabled: false,
      sortOrder: 1,
    },
    {
      stepKey: RegistrationFlowStepKey.FORM,
      label: "فرم",
      enabled: true,
      sortOrder: 2,
    },
    {
      stepKey: RegistrationFlowStepKey.DOCUMENTS,
      label: "مدارک",
      enabled: false,
      sortOrder: 3,
    },
    {
      stepKey: RegistrationFlowStepKey.REVIEW,
      label: "بازبینی",
      enabled: true,
      sortOrder: 4,
    },
    {
      stepKey: RegistrationFlowStepKey.PAYMENT,
      label: "پرداخت",
      enabled: true,
      sortOrder: 5,
    },
    {
      stepKey: RegistrationFlowStepKey.CONFIRMATION,
      label: "تأیید",
      enabled: true,
      sortOrder: 6,
    },
  ];

  const plan = buildWizardPlan(flowSteps);
  assert.deepEqual(
    plan.steps.map((s) => s.panel),
    ["STUDENT", "FORM", "REVIEW", "PAYMENT"],
  );
  assert.equal(plan.totalSteps, 4);
  assert.equal(plan.has("APPLICANT"), false);
  assert.equal(plan.has("DOCUMENTS"), false);
  assert.equal(plan.has("STUDENT"), true);
  assert.equal(plan.indexOf("FORM"), 2);
});

test("short FORM+PAYMENT+REVIEW plan", () => {
  const flowSteps: FlowStepLike[] = [
    {
      stepKey: RegistrationFlowStepKey.FORM,
      label: "جزئیات",
      enabled: true,
      sortOrder: 0,
    },
    {
      stepKey: RegistrationFlowStepKey.PAYMENT,
      label: "پرداخت",
      enabled: true,
      sortOrder: 1,
    },
    {
      stepKey: RegistrationFlowStepKey.REVIEW,
      label: "بازبینی",
      enabled: true,
      sortOrder: 2,
    },
  ];

  const plan = buildWizardPlan(flowSteps);
  assert.deepEqual(
    plan.steps.map((s) => s.panel),
    ["FORM", "PAYMENT", "REVIEW"],
  );
  assert.equal(plan.totalSteps, 3);
  assert.equal(plan.has("STUDENT"), false);
  assert.equal(plan.panelAt(1)?.panel, "FORM");
  assert.equal(plan.panelAt(3)?.panel, "REVIEW");
});

test("legacy fallback when no steps", () => {
  const planNull = buildWizardPlan(null);
  const planEmpty = buildWizardPlan([]);

  assert.equal(planNull.totalSteps, LEGACY_WIZARD_PANELS.length);
  assert.equal(planEmpty.totalSteps, LEGACY_WIZARD_PANELS.length);
  assert.deepEqual(
    planNull.steps.map((s) => s.panel),
    LEGACY_WIZARD_PANELS.map((p) => p.panel),
  );
  assert.deepEqual(
    planEmpty.steps.map((s) => s.panel),
    ["STUDENT", "APPLICANT", "FORM", "DOCUMENTS", "REVIEW", "PAYMENT"],
  );
});

console.log(`\n${passed} registration-wizard-plan tests passed.`);
