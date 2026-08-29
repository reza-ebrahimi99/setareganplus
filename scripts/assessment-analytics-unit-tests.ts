/**
 * Pure Academic Analytics helper tests. No database connection.
 */

import assert from "node:assert/strict";
import {
  average,
  buildDistribution,
  finiteNumbers,
  median,
  percentileOfValue,
  rankMovement,
  safeDivide,
  scoreDelta,
  summarizeMetrics,
} from "../lib/assessment/analytics/helpers";

let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

test("average returns null for empty input", () => {
  assert.equal(average([]), null);
});

test("average ignores non-finite values via finiteNumbers", () => {
  assert.equal(average(finiteNumbers([10, null, Number.NaN, 20])), 15);
});

test("median handles odd and even lengths", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test("percentileOfValue uses midrank and is deterministic", () => {
  const sample = [10, 20, 30, 40, 50];
  assert.equal(percentileOfValue(30, sample), 50);
  assert.equal(percentileOfValue(10, sample), 10);
  assert.equal(percentileOfValue(50, sample), 90);
});

test("distribution is empty for empty samples and stable for equal values", () => {
  assert.deepEqual(buildDistribution([]), []);
  const single = buildDistribution([7, 7, 7], { bucketCount: 3 });
  assert.equal(single.length, 1);
  assert.equal(single[0]!.count, 3);
  assert.equal(single[0]!.ratio, 1);
});

test("rankMovement treats lower rank as improvement", () => {
  assert.equal(rankMovement(10, 4), 6);
  assert.equal(rankMovement(4, 10), -6);
  assert.equal(rankMovement(null, 4), null);
});

test("scoreDelta and safeDivide guard null / zero", () => {
  assert.equal(scoreDelta(80, 90), 10);
  assert.equal(scoreDelta(null, 90), null);
  assert.equal(safeDivide(5, 0), null);
  assert.equal(safeDivide(5, 2), 2.5);
});

test("summarizeMetrics returns zeroed-null shape for empty", () => {
  const summary = summarizeMetrics([]);
  assert.equal(summary.count, 0);
  assert.equal(summary.average, null);
  assert.equal(summary.median, null);
  assert.equal(summary.highest, null);
  assert.equal(summary.lowest, null);
  assert.equal(summary.stdDev, null);
});

console.log(`\n${passed} assessment analytics unit tests passed.`);
