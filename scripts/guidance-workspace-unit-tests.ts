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
import { deriveOfficeCasePulse } from "../lib/guidance/office/pulse";
import { resolveOfficeRailSections } from "../lib/guidance/office/nav";
import {
  deriveOfficeJourneyTracker,
  type TrackerDerivationInput,
} from "../lib/guidance/office/tracker";

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

test("office pulse: pending document waits on counselor", () => {
  const pulse = deriveOfficeCasePulse({
    currentStep: 5,
    completionPercentage: 40,
    finalApproved: false,
    hasCounselorRevision: false,
    hasPendingDocument: true,
    unpaid: false,
  });
  assert.equal(pulse.status, "waiting_on_counselor");
  assert.equal(pulse.waitingKind, "counselor");
});

test("office pulse: revision waits on student", () => {
  const pulse = deriveOfficeCasePulse({
    currentStep: 5,
    completionPercentage: 40,
    finalApproved: false,
    hasCounselorRevision: true,
    hasPendingDocument: false,
    unpaid: false,
  });
  assert.equal(pulse.status, "waiting_on_student");
});

test("office pulse: final approval is terminal", () => {
  const pulse = deriveOfficeCasePulse({
    currentStep: 12,
    completionPercentage: 100,
    finalApproved: true,
    hasCounselorRevision: false,
    hasPendingDocument: false,
    unpaid: false,
  });
  assert.equal(pulse.status, "approved");
  assert.equal(pulse.waitingKind, "none");
});

function trackerInput(
  over: Partial<TrackerDerivationInput> = {},
): TrackerDerivationInput {
  return {
    currentStep: 1,
    completedSteps: [],
    completionPercentage: 0,
    finalApproved: false,
    personalInfoConfirmed: false,
    packageCode: null,
    packagePaid: false,
    choicesApproved: false,
    hasFinalGrades: false,
    hasExamResult: false,
    reviews: [],
    ...over,
  };
}

test("tracker shows all 12 phases with current highlighted", () => {
  const model = deriveOfficeJourneyTracker(trackerInput({ currentStep: 3, completedSteps: [1, 2], completionPercentage: 17 }));
  assert.equal(model.phases.length, 12);
  assert.equal(model.phases.filter((phase) => phase.status === "active").length, 1);
  assert.equal(model.phases[2]?.status, "active");
  assert.equal(model.currentStep, 3);
  assert.equal(model.phases[0]?.status, "completed");
  assert.equal(model.phases[3]?.status, "locked");
});

test("tracker past phases are reviewable; future phases have lock copy", () => {
  const model = deriveOfficeJourneyTracker(
    trackerInput({ currentStep: 3, completedSteps: [1, 2], completionPercentage: 17 }),
  );
  assert.equal(model.phases[0]?.reviewable, true);
  assert.equal(model.phases[1]?.reviewable, true);
  assert.equal(model.phases[2]?.href, "/portal/student/services/guidance/steps/3");
  const atInterest = deriveOfficeJourneyTracker(
    trackerInput({ currentStep: 2, completedSteps: [1], completionPercentage: 8 }),
  );
  assert.equal(atInterest.phases[1]?.href, "/ms/interest");
  assert.equal(model.phases[3]?.href, null);
  assert.ok(model.phases[1]?.lockReason === null);
  assert.ok(model.phases[3]?.lockReason?.includes("فعال"));
  for (const phase of model.phases) {
    assert.ok(phase.description.length > 0);
    assert.ok(phase.estimatedDuration.length > 0);
    assert.ok(phase.requiredActions.length > 0);
    assert.ok(phase.counselorLabel.length > 0);
    assert.equal(phase.lockReason?.includes("به‌زودی") ?? false, false);
    assert.equal(phase.lockReason?.includes("به زودی") ?? false, false);
  }
});

test("tracker lock copy matches the student journey", () => {
  const model = deriveOfficeJourneyTracker(trackerInput());
  assert.equal(model.phases[1]?.lockReason, "بعد از ثبت اطلاعات فعال می‌شود");
  assert.ok(model.phases[2]?.lockReason?.includes("رغبت"));
  assert.ok(model.phases[1]?.knowledgeNote?.includes("رغبت"));
});

test("tracker counselor status uses reviews, never private notes", () => {
  const model = deriveOfficeJourneyTracker(
    trackerInput({
      currentStep: 2,
      completedSteps: [1],
      completionPercentage: 8,
      personalInfoConfirmed: true,
      hasFinalGrades: true,
      reviews: [
        {
          stepNumber: 1,
          status: "APPROVED",
          studentMessage: "شناسنامه تأیید شد",
          rejectReason: null,
        },
        {
          stepNumber: 2,
          status: "NEEDS_REVISION",
          studentMessage: "لطفاً آزمون را کامل کنید",
          rejectReason: null,
        },
      ],
    }),
  );
  assert.equal(model.phases[0]?.counselorKind, "approved");
  assert.equal(model.phases[0]?.counselorMessage, "شناسنامه تأیید شد");
  assert.equal(model.phases[1]?.counselorKind, "needs_revision");
  assert.equal(model.phases[1]?.counselorMessage, "لطفاً آزمون را کامل کنید");
  assert.equal(model.phases[2]?.counselorKind, "not_reached");
});

test("tracker final approval completes every phase", () => {
  const model = deriveOfficeJourneyTracker(
    trackerInput({
      currentStep: 12,
      completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      completionPercentage: 100,
      finalApproved: true,
    }),
  );
  assert.ok(model.phases.every((phase) => phase.status === "completed"));
  assert.ok(model.phases.every((phase) => phase.counselorKind === "approved"));
  assert.equal(model.completionPercentage, 100);
});

test("office rail never uses coming-soon copy", () => {
  const early = resolveOfficeRailSections({
    currentStep: 1,
    completedSteps: [],
    finalApproved: false,
  });
  const afterInterest = resolveOfficeRailSections({
    currentStep: 3,
    completedSteps: [1, 2],
    finalApproved: false,
  });
  const items = [...early, ...afterInterest].flatMap((section) => section.items);
  for (const item of items) {
    const blob = `${item.label} ${item.lockReason ?? ""}`;
    assert.equal(blob.includes("به‌زودی"), false);
    assert.equal(blob.includes("به زودی"), false);
  }
  const interest = early.flatMap((s) => s.items).find((item) => item.id === "interest");
  assert.equal(interest?.live, true);
  assert.equal(interest?.href, "/ms/interest");
  const uni = afterInterest.flatMap((s) => s.items).find((item) => item.id === "universities");
  assert.equal(uni?.live, true);
  assert.equal(uni?.href, "/discover/systems");
  const journey = early.flatMap((s) => s.items).find((item) => item.id === "journey");
  assert.equal(journey?.live, true);
  assert.equal(journey?.href, "/ms/journey");
});

console.log("guidance workspace unit tests passed");
