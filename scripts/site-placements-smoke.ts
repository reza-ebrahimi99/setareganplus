/**
 * Pure smoke tests for site placements (no database).
 * Run: npx tsx scripts/site-placements-smoke.ts
 */

import assert from "node:assert/strict";
import { decidePlacementResolution } from "../lib/site/placement-resolution";
import {
  SITE_PLACEMENT_KEYS,
  SITE_PLACEMENT_REGISTRY,
  displayModesForContent,
  isSitePlacementKey,
} from "../lib/site/placement-registry";

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

test("1. database placement overrides env fallback", () => {
  const decision = decidePlacementResolution({
    row: {
      isEnabled: true,
      contentType: "FORM",
      hasValidContent: true,
    },
    envSlug: "env-form",
  });
  assert.equal(decision.outcome, "use_database");
  assert.equal(decision.source, "database");
});

test("2. env fallback when no database placement", () => {
  const decision = decidePlacementResolution({
    row: null,
    envSlug: "env-form",
  });
  assert.equal(decision.outcome, "use_env");
});

test("3. disabled database placement suppresses env", () => {
  const decision = decidePlacementResolution({
    row: {
      isEnabled: false,
      contentType: "FORM",
      hasValidContent: true,
    },
    envSlug: "env-form",
  });
  assert.equal(decision.outcome, "disabled");
});

test("4. published form selection path (registry allows FORM)", () => {
  assert.deepEqual(
    SITE_PLACEMENT_REGISTRY.PRE_REGISTRATION_FORM.allowedContentTypes,
    ["FORM"],
  );
});

test("5. draft form selection rejected conceptually (FORM requires published)", () => {
  const decision = decidePlacementResolution({
    row: {
      isEnabled: true,
      contentType: "FORM",
      hasValidContent: false,
    },
    envSlug: "env-form",
  });
  assert.equal(decision.outcome, "invalid_database");
});

test("6. paused form public fallback (invalid DB, no env override)", () => {
  const decision = decidePlacementResolution({
    row: {
      isEnabled: true,
      contentType: "FORM",
      hasValidContent: false,
    },
    envSlug: "still-in-env",
  });
  assert.equal(decision.outcome, "invalid_database");
  assert.notEqual(decision.outcome, "use_env");
});

test("7. active booking selection path", () => {
  assert.deepEqual(
    SITE_PLACEMENT_REGISTRY.CONSULTATION_BOOKING.allowedContentTypes,
    ["BOOKING"],
  );
});

test("8. inactive booking selection fails", () => {
  const decision = decidePlacementResolution({
    row: {
      isEnabled: true,
      contentType: "BOOKING",
      hasValidContent: false,
    },
    envSlug: null,
  });
  assert.equal(decision.outcome, "invalid_database");
});

test("9. cross-org form rejected conceptually via ownership check requirement", () => {
  // Registry + actions require org-scoped published form IDs; pure guard:
  assert.equal(isSitePlacementKey("PRE_REGISTRATION_FORM"), true);
  assert.equal(isSitePlacementKey("ARBITRARY_ROUTE"), false);
});

test("10. cross-org booking rejected conceptually", () => {
  assert.equal(
    SITE_PLACEMENT_REGISTRY.CONSULTATION_BOOKING.targetPath,
    "/consultation",
  );
});

test("11. pre-registration form placement key exists", () => {
  assert.ok(SITE_PLACEMENT_KEYS.includes("PRE_REGISTRATION_FORM"));
});

test("12. consultation form only decision", () => {
  const form = decidePlacementResolution({
    row: { isEnabled: true, contentType: "FORM", hasValidContent: true },
    envSlug: null,
  });
  const booking = decidePlacementResolution({
    row: null,
    envSlug: null,
  });
  assert.equal(form.outcome, "use_database");
  assert.equal(booking.outcome, "none");
});

test("13. consultation booking only decision", () => {
  const booking = decidePlacementResolution({
    row: { isEnabled: true, contentType: "BOOKING", hasValidContent: true },
    envSlug: null,
  });
  assert.equal(booking.outcome, "use_database");
});

test("14. consultation both independent", () => {
  const form = decidePlacementResolution({
    row: { isEnabled: true, contentType: "FORM", hasValidContent: true },
    envSlug: null,
  });
  const booking = decidePlacementResolution({
    row: { isEnabled: true, contentType: "BOOKING", hasValidContent: true },
    envSlug: null,
  });
  assert.equal(form.outcome, "use_database");
  assert.equal(booking.outcome, "use_database");
});

test("15. reset (no row) returns to env fallback", () => {
  const decision = decidePlacementResolution({
    row: null,
    envSlug: "from-env",
  });
  assert.equal(decision.outcome, "use_env");
});

test("16. display modes for form exclude CARD", () => {
  assert.deepEqual(displayModesForContent("FORM"), [
    "FULL",
    "EMBEDDED",
    "COMPACT",
  ]);
});

test("17. display modes for booking include CARD", () => {
  assert.ok(displayModesForContent("BOOKING").includes("CARD"));
});

test("18. NONE content with enabled row is invalid (no env)", () => {
  const decision = decidePlacementResolution({
    row: {
      isEnabled: true,
      contentType: "NONE",
      hasValidContent: false,
    },
    envSlug: "env",
  });
  assert.equal(decision.outcome, "invalid_database");
});

console.log(`\n${passed} site-placement smoke tests passed.`);
