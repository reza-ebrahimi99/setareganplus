/**
 * Pure smoke tests for StarOS v0.5.2A visibility + validation.
 * No database required.
 *
 * Run: npx tsx scripts/visibility-smoke.ts
 */

import assert from "node:assert/strict";
import {
  detectVisibilityCycles,
  evaluateAllFieldVisibility,
  evaluateVisibilityCondition,
  parseVisibilityConditions,
  validateVisibilityConditionForField,
  type VisibilityCondition,
} from "../lib/forms/field-visibility";
import { validatePublicSubmission } from "../lib/forms/validate-public-submission";
import { FormFieldType } from "../generated/prisma/enums";

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

const choiceConfig = {
  options: [
    { value: "yes", label: "بله" },
    { value: "no", label: "خیر" },
  ],
};

const multiConfig = {
  options: [
    { value: "math", label: "ریاضی" },
    { value: "science", label: "علوم" },
    { value: "art", label: "هنر" },
  ],
};

const fieldsMeta = [
  {
    fieldKey: "needs",
    sortOrder: 1,
    type: "SINGLE_CHOICE",
    label: "نیاز به مشاوره",
    config: choiceConfig,
  },
  {
    fieldKey: "topics",
    sortOrder: 2,
    type: "MULTIPLE_CHOICE",
    label: "موضوعات",
    config: multiConfig,
  },
  {
    fieldKey: "consent",
    sortOrder: 3,
    type: "CONSENT",
    label: "رضایت",
  },
  {
    fieldKey: "mobile",
    sortOrder: 4,
    type: "MOBILE",
    label: "موبایل",
  },
  {
    fieldKey: "detail",
    sortOrder: 5,
    type: "SHORT_TEXT",
    label: "توضیح",
  },
];

test("1. equals on SINGLE_CHOICE", () => {
  const condition: VisibilityCondition = {
    sourceFieldKey: "needs",
    operator: "equals",
    value: "yes",
  };
  assert.equal(
    evaluateVisibilityCondition(condition, { needs: "yes" }, "SINGLE_CHOICE"),
    true,
  );
  assert.equal(
    evaluateVisibilityCondition(condition, { needs: "no" }, "SINGLE_CHOICE"),
    false,
  );
});

test("2. notEquals", () => {
  const condition: VisibilityCondition = {
    sourceFieldKey: "needs",
    operator: "notEquals",
    value: "yes",
  };
  assert.equal(
    evaluateVisibilityCondition(condition, { needs: "no" }, "SINGLE_CHOICE"),
    true,
  );
});

test("3. contains on MULTIPLE_CHOICE", () => {
  const condition: VisibilityCondition = {
    sourceFieldKey: "topics",
    operator: "contains",
    value: "math",
  };
  assert.equal(
    evaluateVisibilityCondition(
      condition,
      { topics: ["math", "art"] },
      "MULTIPLE_CHOICE",
    ),
    true,
  );
});

test("4. notContains", () => {
  const condition: VisibilityCondition = {
    sourceFieldKey: "topics",
    operator: "notContains",
    value: "science",
  };
  assert.equal(
    evaluateVisibilityCondition(
      condition,
      { topics: ["math"] },
      "MULTIPLE_CHOICE",
    ),
    true,
  );
});

test("5. CONSENT true/false", () => {
  assert.equal(
    evaluateVisibilityCondition(
      { sourceFieldKey: "consent", operator: "equals", value: true },
      { consent: true },
      "CONSENT",
    ),
    true,
  );
  assert.equal(
    evaluateVisibilityCondition(
      { sourceFieldKey: "consent", operator: "equals", value: "false" },
      { consent: false },
      "CONSENT",
    ),
    true,
  );
});

test("6. isAnswered", () => {
  assert.equal(
    evaluateVisibilityCondition(
      { sourceFieldKey: "mobile", operator: "isAnswered" },
      { mobile: "09121234567" },
      "MOBILE",
    ),
    true,
  );
});

test("7. isNotAnswered", () => {
  assert.equal(
    evaluateVisibilityCondition(
      { sourceFieldKey: "mobile", operator: "isNotAnswered" },
      { mobile: "" },
      "MOBILE",
    ),
    true,
  );
});

test("8. hidden required field is not required", () => {
  const formData = new FormData();
  formData.set("needs", "no");
  // detail is required but hidden when needs != yes; malicious value present
  formData.set("detail", "");

  const result = validatePublicSubmission(
    [
      {
        id: "f1",
        fieldKey: "needs",
        type: FormFieldType.SINGLE_CHOICE,
        label: "نیاز",
        required: true,
        config: choiceConfig,
        visibilityConditions: null,
      },
      {
        id: "f2",
        fieldKey: "detail",
        type: FormFieldType.SHORT_TEXT,
        label: "توضیح",
        required: true,
        config: {},
        visibilityConditions: {
          sourceFieldKey: "needs",
          operator: "equals",
          value: "yes",
        },
      },
    ],
    formData,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.answers.length, 1);
    assert.equal(result.answers[0]?.fieldKey, "needs");
  }
});

test("9. malicious hidden answer discarded", () => {
  const formData = new FormData();
  formData.set("needs", "no");
  formData.set("detail", "should-not-store");

  const result = validatePublicSubmission(
    [
      {
        id: "f1",
        fieldKey: "needs",
        type: FormFieldType.SINGLE_CHOICE,
        label: "نیاز",
        required: true,
        config: choiceConfig,
      },
      {
        id: "f2",
        fieldKey: "detail",
        type: FormFieldType.SHORT_TEXT,
        label: "توضیح",
        required: false,
        config: {},
        visibilityConditions: {
          sourceFieldKey: "needs",
          operator: "equals",
          value: "yes",
        },
      },
    ],
    formData,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      result.answers.some((answer) => answer.fieldKey === "detail"),
      false,
    );
    assert.equal(result.values.detail, undefined);
  }
});

test("10. source answer cleared after dependent value exists (eval)", () => {
  const evaluated = evaluateAllFieldVisibility({
    fields: [
      {
        fieldKey: "needs",
        type: "SINGLE_CHOICE",
        visibilityConditions: null,
      },
      {
        fieldKey: "detail",
        type: "SHORT_TEXT",
        visibilityConditions: {
          sourceFieldKey: "needs",
          operator: "equals",
          value: "yes",
        },
      },
    ],
    answers: { needs: "no", detail: "old" },
  });
  assert.equal(evaluated.ok, true);
  if (evaluated.ok) {
    assert.equal(evaluated.visible.detail, false);
  }
});

test("11. invalid source field", () => {
  const result = validateVisibilityConditionForField({
    dependentFieldKey: "detail",
    dependentLabel: "توضیح",
    visibilityConditions: {
      sourceFieldKey: "missing",
      operator: "equals",
      value: "x",
    },
    fields: fieldsMeta,
  });
  assert.equal(result.ok, false);
});

test("12. self dependency", () => {
  const result = validateVisibilityConditionForField({
    dependentFieldKey: "detail",
    dependentLabel: "توضیح",
    visibilityConditions: {
      sourceFieldKey: "detail",
      operator: "isAnswered",
    },
    fields: fieldsMeta,
  });
  assert.equal(result.ok, false);
});

test("13. cycle detection", () => {
  const err = detectVisibilityCycles([
    {
      fieldKey: "a",
      label: "الف",
      visibilityConditions: {
        sourceFieldKey: "b",
        operator: "isAnswered",
      },
    },
    {
      fieldKey: "b",
      label: "ب",
      visibilityConditions: {
        sourceFieldKey: "a",
        operator: "isAnswered",
      },
    },
  ]);
  assert.ok(err);
});

test("14. invalid choice comparison value", () => {
  const result = validateVisibilityConditionForField({
    dependentFieldKey: "detail",
    dependentLabel: "توضیح",
    visibilityConditions: {
      sourceFieldKey: "needs",
      operator: "equals",
      value: "not-an-option",
    },
    fields: fieldsMeta,
  });
  assert.equal(result.ok, false);
});

test("15. parse canonical contract", () => {
  const parsed = parseVisibilityConditions({
    sourceFieldKey: "needs_consultation",
    operator: "equals",
    value: "yes",
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.condition?.sourceFieldKey, "needs_consultation");
  }
});

test("16. legacy config.visibility compatibility", () => {
  const parsed = parseVisibilityConditions(null);
  assert.equal(parsed.ok, true);
  const legacy = validateVisibilityConditionForField({
    dependentFieldKey: "detail",
    dependentLabel: "توضیح",
    visibilityConditions: null,
    config: {
      visibility: {
        dependsOn: "needs",
        operator: "equals",
        value: "yes",
      },
    },
    fields: fieldsMeta,
  });
  assert.equal(legacy.ok, true);
});

test("17. later source field rejected", () => {
  const result = validateVisibilityConditionForField({
    dependentFieldKey: "needs",
    dependentLabel: "نیاز",
    visibilityConditions: {
      sourceFieldKey: "detail",
      operator: "isAnswered",
    },
    fields: fieldsMeta,
  });
  assert.equal(result.ok, false);
});

test("18. INFORMATIONAL cannot be source", () => {
  const result = validateVisibilityConditionForField({
    dependentFieldKey: "detail",
    dependentLabel: "توضیح",
    visibilityConditions: {
      sourceFieldKey: "info",
      operator: "isAnswered",
    },
    fields: [
      ...fieldsMeta,
      {
        fieldKey: "info",
        sortOrder: 0,
        type: "INFORMATIONAL",
        label: "راهنما",
      },
    ],
  });
  assert.equal(result.ok, false);
});

console.log(`\n${passed} visibility smoke tests passed.`);
