/**
 * CLI runner for Atrin Education evaluation suite.
 * Usage: npx tsx scripts/atrin-education-eval.ts
 */

import {
  formatEvaluationReport,
  runEducationEvaluationSuite,
} from "../lib/atrin/evaluation";

const suite = runEducationEvaluationSuite(undefined, {
  persistAnalytics: false,
});

console.log(formatEvaluationReport(suite));

const failed = suite.items.filter((i) => i.qualityScore < 0.7);
if (failed.length) {
  console.log("\nBelow threshold:");
  for (const item of failed.slice(0, 12)) {
    console.log(`- ${item.itemId} (${item.qualityScore.toFixed(2)})`);
    for (const s of item.suggestions.slice(0, 3)) {
      console.log(`  · ${s}`);
    }
  }
}

// Soft exit: architecture sprint should not fail CI on heuristic accuracy.
process.exit(0);
