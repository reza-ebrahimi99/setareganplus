import assert from "node:assert/strict";
import {
  canTransitionReview,
  normalizeV2ReviewStatus,
  reviewStatusBlocksStudentProgress,
} from "../lib/guidance/journey-v2/step-review/status";
import {
  mergeNeedsReviewFlags,
  previewStepChangeImpact,
  STEP_DOWNSTREAM_REVIEW_MAP,
} from "../lib/guidance/journey-v2/step-review/dependencies";
import {
  addOpenRevisionStep,
  parseOpenRevisionSteps,
  removeOpenRevisionStep,
} from "../lib/guidance/journey-v2/step-review/plan-json";

assert.equal(normalizeV2ReviewStatus("PENDING"), "UNREVIEWED");
assert.equal(normalizeV2ReviewStatus("APPROVED"), "REVIEWED");
assert.equal(normalizeV2ReviewStatus("NEEDS_REVISION"), "REVISION_REQUESTED");
assert.equal(reviewStatusBlocksStudentProgress("UNREVIEWED"), false);
assert.equal(reviewStatusBlocksStudentProgress("REVISION_REQUESTED"), false);

assert.equal(
  canTransitionReview("REVISION_REQUESTED", "RESUBMITTED", "student"),
  true,
);
assert.equal(canTransitionReview("UNREVIEWED", "REVIEWED", "counselor"), true);

const impact = previewStepChangeImpact(4);
assert.ok(impact.affectedSteps.includes(13));
assert.match(impact.summaryFa, /حذف/);

assert.deepEqual(parseOpenRevisionSteps([1, "2", 99]), [1, 2]);
assert.deepEqual(addOpenRevisionStep([2], 4), [2, 4]);
assert.deepEqual(removeOpenRevisionStep([2, 4], 2), [4]);

const flags = mergeNeedsReviewFlags({}, STEP_DOWNSTREAM_REVIEW_MAP[1] ?? []);
assert.equal(flags["13"], true);

console.log("guidance v2 step review unit tests passed");
