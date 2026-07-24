/**
 * Unit tests: organization settings + registration stage mapping defaults.
 * Run: npx tsx scripts/registration-stage-mapping-unit-tests.ts
 */

import assert from "node:assert/strict";
import {
  DEFAULT_REGISTRATION_STAGE_MAPPING,
  parseOrganizationSettings,
  resolveRegistrationStageMapping,
  mergeOrganizationSettings,
} from "../lib/organizations/settings";
import { legacyPhaseToMappingKey } from "../lib/registration/stage-mapping";
import {
  parseAppliedPromotionsFromMetadata,
  APPLIED_PROMOTIONS_SCHEMA_VERSION,
} from "../lib/registration/applied-promotions";

function testDefaults() {
  const mapping = resolveRegistrationStageMapping(parseOrganizationSettings(null));
  assert.equal(
    mapping.registrationStarted,
    DEFAULT_REGISTRATION_STAGE_MAPPING.registrationStarted,
  );
  assert.equal(
    mapping.paymentPending,
    DEFAULT_REGISTRATION_STAGE_MAPPING.paymentPending,
  );
  assert.equal(
    mapping.registrationCompleted,
    DEFAULT_REGISTRATION_STAGE_MAPPING.registrationCompleted,
  );
  assert.equal(mapping.registrationCancelled, null);
}

function testCustomOverride() {
  const settings = parseOrganizationSettings({
    registrationStageMapping: {
      registrationCompleted: "enrolled",
      paymentPending: "awaiting-pay",
    },
  });
  const mapping = resolveRegistrationStageMapping(settings);
  assert.equal(mapping.registrationCompleted, "enrolled");
  assert.equal(mapping.paymentPending, "awaiting-pay");
  assert.equal(
    mapping.registrationStarted,
    DEFAULT_REGISTRATION_STAGE_MAPPING.registrationStarted,
  );
}

function testMergeKeepsUnset() {
  const merged = mergeOrganizationSettings(
    { registrationStageMapping: { registrationStarted: "consult" } },
    { registrationStageMapping: { paymentPending: "pay" } },
  );
  assert.equal(merged.registrationStageMapping?.paymentPending, "pay");
  assert.equal(merged.registrationStageMapping?.registrationStarted, undefined);
}

function testLegacyPhaseKeys() {
  assert.equal(legacyPhaseToMappingKey("started"), "registrationStarted");
  assert.equal(legacyPhaseToMappingKey("payment_pending"), "paymentPending");
  assert.equal(legacyPhaseToMappingKey("registered"), "registrationCompleted");
  assert.equal(legacyPhaseToMappingKey("cancelled"), "registrationCancelled");
}

function testAppliedPromotionsLegacy() {
  const parsed = parseAppliedPromotionsFromMetadata({
    appliedPromotions: [
      {
        promotionId: "p1",
        title: "Welcome",
        type: "COUPON",
        discountAmountRials: 1000,
      },
    ],
  });
  assert.equal(parsed.schemaVersion, APPLIED_PROMOTIONS_SCHEMA_VERSION);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0]!.discountAmountRials, 1000);
}

testDefaults();
testCustomOverride();
testMergeKeepsUnset();
testLegacyPhaseKeys();
testAppliedPromotionsLegacy();
console.log("registration-stage-mapping-unit-tests: ok");
