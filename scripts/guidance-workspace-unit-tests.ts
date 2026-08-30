/**
 * Professional Counselor Workspace Phase 1 — unit tests (no DB).
 * Run: npm run test:guidance-workspace
 */

import assert from "node:assert/strict";
import {
  isWorkspaceQueueFilter,
  matchesWorkspaceQueueFilter,
  summarizeStep1Fields,
  summarizeStep3Fields,
  summarizeStep5Fields,
  summarizeStep6Fields,
  summarizeStep10Fields,
  workspaceExamGroupLabel,
} from "../lib/guidance/workspace";
import { workspaceStepEmptyMessage } from "../lib/guidance/workspace/presentation";
import { computeRewindPlanState, diffFields } from "../lib/guidance/workspace";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("workspace queue filters are recognized", () => {
  assert.equal(isWorkspaceQueueFilter("all"), true);
  assert.equal(isWorkspaceQueueFilter("awaiting_payment"), true);
  assert.equal(isWorkspaceQueueFilter("awaiting_review"), true);
  assert.equal(isWorkspaceQueueFilter("nope"), false);
});

test("queue filter: awaiting payment is only unpaid step 3", () => {
  const unpaid = {
    currentStep: 3 as const,
    paid: false,
    choicesApproved: false,
    finalApproved: false,
    reviewStatus: "awaiting_review" as const,
    transcriptStatus: "none" as const,
  };
  const paid = { ...unpaid, paid: true };
  assert.equal(matchesWorkspaceQueueFilter(unpaid, "awaiting_payment"), true);
  assert.equal(matchesWorkspaceQueueFilter(paid, "awaiting_payment"), false);
  assert.equal(matchesWorkspaceQueueFilter(unpaid, "in_progress"), true);
});

test("queue filter: journey completed vs in progress", () => {
  const done = {
    currentStep: 12 as const,
    paid: true,
    choicesApproved: true,
    finalApproved: true,
    reviewStatus: "ready_for_session" as const,
    transcriptStatus: "verified" as const,
  };
  assert.equal(matchesWorkspaceQueueFilter(done, "journey_completed"), true);
  assert.equal(matchesWorkspaceQueueFilter(done, "in_progress"), false);
});

test("queue filter: awaiting choices is unpaid-approval step 10", () => {
  const waiting = {
    currentStep: 10 as const,
    paid: true,
    choicesApproved: false,
    finalApproved: false,
    reviewStatus: "in_review" as const,
    transcriptStatus: "verified" as const,
  };
  assert.equal(matchesWorkspaceQueueFilter(waiting, "awaiting_choices"), true);
  assert.equal(
    matchesWorkspaceQueueFilter({ ...waiting, choicesApproved: true }, "awaiting_choices"),
    false,
  );
});

test("exam group labels stay Persian", () => {
  assert.equal(workspaceExamGroupLabel("EXPERIMENTAL_SCIENCES"), "تجربی");
  assert.equal(workspaceExamGroupLabel("MATHEMATICS"), "ریاضی");
});

test("step 1 summary includes quota and national id", () => {
  const rows = summarizeStep1Fields({
    fullName: "علی رضایی",
    nationalId: "0012345678",
    gender: "MALE",
    birthDate: "2006-04-01",
    province: "تهران",
    quota: "NORMAL",
    highSchoolAverage: 18.5,
    confirmedAtIso: "2026-08-01T00:00:00.000Z",
  });
  assert.ok(rows.some((row) => row.label === "نام و نام خانوادگی" && row.value === "علی رضایی"));
  assert.ok(rows.some((row) => row.label === "جنسیت" && row.value === "آقا"));
  assert.ok(rows.some((row) => row.label === "سهمیه" && row.value.includes("آزاد")));
});

test("step 3 and 5 and 10 summaries", () => {
  const pkg = summarizeStep3Fields({
    packageCode: "PREMIUM",
    paidAtIso: "2026-08-01T00:00:00.000Z",
  });
  assert.ok(pkg.some((row) => row.value.includes("حرفه‌ای")));
  assert.ok(pkg.some((row) => row.value === "پرداخت شده"));

  const exam = summarizeStep5Fields({
    nationalRank: 1200,
    regionalRank: 80,
    quotaRank: null,
    score: 9123,
  });
  assert.ok(exam.some((row) => row.label === "رتبه کشوری"));

  const choices = summarizeStep10Fields({
    choiceCount: 150,
    approved: false,
    importedAtIso: "2026-08-01T00:00:00.000Z",
  });
  assert.ok(choices.some((row) => row.label === "تأیید مشاور" && row.value === "تأیید نشده"));
});

test("step 6 only lists enabled education types", () => {
  const rows = summarizeStep6Fields([
    { code: "DAILY", enabled: true, rank: 1 },
    { code: "NIGHT", enabled: false, rank: 2 },
    { code: "AZAD", enabled: true, rank: 3 },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.value, "روزانه");
  assert.equal(rows[1]?.value, "دانشگاه آزاد اسلامی");
});

test("locked vs completed empty messages", () => {
  assert.ok(workspaceStepEmptyMessage("locked")?.includes("باز نشده"));
  assert.equal(workspaceStepEmptyMessage("completed"), null);
});

test("rewind drops later completed steps and recalculates percent", () => {
  const result = computeRewindPlanState({
    targetStep: 5,
    currentStep: 9,
    completedSteps: [1, 2, 3, 4, 5, 6, 7, 8],
  });
  assert.equal(result.needsRewind, true);
  assert.deepEqual(result.nextCompleted, [1, 2, 3, 4]);
  assert.equal(result.nextStatusKey, "STEP4_COMPLETED");
  assert.equal(result.completionPercentage, 33);
});

test("rewind is a no-op when student is already on the target step", () => {
  const result = computeRewindPlanState({
    targetStep: 5,
    currentStep: 5,
    completedSteps: [1, 2, 3, 4],
  });
  assert.equal(result.needsRewind, false);
});

test("field diff records old and new values", () => {
  const changes = diffFields(
    { quota: "NORMAL", average: "18" },
    { quota: "VETERAN_5", average: "18" },
  );
  assert.equal(changes.length, 1);
  assert.equal(changes[0]?.field, "quota");
  assert.equal(changes[0]?.oldValue, "NORMAL");
  assert.equal(changes[0]?.newValue, "VETERAN_5");
});

console.log("guidance workspace unit tests passed");
