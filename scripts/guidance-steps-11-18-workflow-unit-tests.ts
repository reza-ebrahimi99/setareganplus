/** Workflow unit tests for guidance steps 11–18 (no DB). */
import assert from "node:assert/strict";
import { validateSanjeshReference } from "../lib/guidance/journey-v2/sanjesh";
import { assertSessionHeldForStepAdvance } from "../lib/guidance/journey-v2/booking-gate";

assert.equal(validateSanjeshReference("  abc-123  ").ok, true);
assert.equal(validateSanjeshReference("").ok, false);
assert.equal(validateSanjeshReference("!!!").ok, false);

assert.equal(
  assertSessionHeldForStepAdvance({
    snapshot: null,
    expectedPurpose: "FIRST_SESSION",
    expectedPlanId: "p",
    expectedCounselorUserId: "c",
    appointmentCompleted: false,
    sessionRecordCompleted: false,
    sessionSummary: "",
  }).ok,
  false,
);

console.log("guidance steps 11-18 workflow unit tests passed");
