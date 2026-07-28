/**
 * Unit tests: registration flow config resolution must prefer DB rows over
 * the legacy static catalog registry (no hardcoded CMS slugs).
 * Run: npx tsx scripts/registration-flow-config-resolve-unit-tests.ts
 */

import assert from "node:assert/strict";
import { getRegistrationCatalog } from "../lib/registration/catalog-registry";
import { normalizeRegistrationFlowSlug } from "../lib/registration/flows/slug";

let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

/**
 * Mirrors resolveRegistrationFlowConfig decision order (without Prisma):
 * DB hit → use DB; else static catalog → seed; else unknown.
 */
function resolveMode(params: {
  flowKey: string;
  dbSlugExists: boolean;
}): "use_db" | "seed_from_catalog" | "unknown" {
  const slug = normalizeRegistrationFlowSlug(params.flowKey);
  void slug;
  if (params.dbSlugExists) return "use_db";
  if (getRegistrationCatalog(params.flowKey)) return "seed_from_catalog";
  return "unknown";
}

test("CMS slug not in static registry uses DB when present", () => {
  const cmsSlug = "azmon1";
  assert.equal(getRegistrationCatalog(cmsSlug), null);
  assert.equal(
    resolveMode({ flowKey: cmsSlug, dbSlugExists: true }),
    "use_db",
  );
});

test("CMS slug without DB row is unknown (does not invent config)", () => {
  assert.equal(
    resolveMode({ flowKey: "some-cms-flow", dbSlugExists: false }),
    "unknown",
  );
});

test("legacy qalamchi-exam can still seed from static catalog", () => {
  const coded = getRegistrationCatalog("qalamchi-exam");
  assert.ok(coded);
  assert.equal(
    resolveMode({ flowKey: "qalamchi-exam", dbSlugExists: false }),
    "seed_from_catalog",
  );
  assert.equal(
    resolveMode({ flowKey: "qalamchi-exam", dbSlugExists: true }),
    "use_db",
  );
});

test("normalizeRegistrationFlowSlug preserves cms slugs", () => {
  assert.equal(normalizeRegistrationFlowSlug("azmon1"), "azmon1");
  assert.equal(normalizeRegistrationFlowSlug("Azmon1"), "azmon1");
});

console.log(`\n${passed} registration-flow-config-resolve tests passed.`);
