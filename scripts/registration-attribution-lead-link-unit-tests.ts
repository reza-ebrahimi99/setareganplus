/**
 * Unit tests for Attribution + Lead-link helpers (no DB).
 * Run: npx tsx scripts/registration-attribution-lead-link-unit-tests.ts
 */

import assert from "node:assert/strict";
import {
  ATTRIBUTION_SCHEMA_VERSION,
  detectAttributionFromUrl,
  mergeAttributionFirstTouch,
  resolveAcquisitionSource,
  applyManualAcquisitionSource,
  toRegistrationAttributionFlat,
  sanitizeClientAttribution,
  parseAttributionFromUnknown,
  attributionToMetadataPatch,
} from "../lib/registration/attribution";
import {
  LEAD_LINK_SCHEMA_VERSION,
  leadLinkToMetadataPatch,
  parseLeadLinkFromMetadata,
} from "../lib/registration/lead-link";
import { resolveRedeemCodePriority } from "../lib/promotions/referral-link";

function testUtmPriority() {
  const attr = detectAttributionFromUrl({
    searchParams: {
      utm_source: "instagram",
      utm_medium: "story",
      utm_campaign: "summer1405",
      ref: "REZA1404",
    },
    landingPage: "/register/math?utm_source=instagram",
  });
  assert.equal(attr.acquisitionSource, "utm");
  assert.equal(attr.utmSource, "instagram");
  assert.equal(attr.referralCode, "REZA1404");
  assert.equal(attr.campaign, "summer1405");
  assert.equal(attr.schemaVersion, ATTRIBUTION_SCHEMA_VERSION);
}

function testReferralWhenNoUtm() {
  const attr = detectAttributionFromUrl({
    searchParams: { ref: "reza1404", qr: "1", qr_campaign: "poster-a" },
  });
  assert.equal(attr.acquisitionSource, "referral");
  assert.equal(attr.referralCode, "REZA1404");
}

function testQrWhenNoUtmOrRef() {
  const attr = detectAttributionFromUrl({
    searchParams: { qr: "booth-12", qr_owner: "staff-1" },
  });
  assert.equal(attr.acquisitionSource, "qr");
  assert.equal(attr.qrIdentifier, "booth-12");
}

function testFirstTouchMerge() {
  const first = detectAttributionFromUrl({
    searchParams: { utm_source: "google", utm_campaign: "brand" },
  });
  const second = detectAttributionFromUrl({
    searchParams: { utm_source: "facebook", utm_campaign: "retarget" },
  });
  const merged = mergeAttributionFirstTouch(first, second);
  assert.equal(merged.utmSource, "google");
  assert.equal(merged.utmCampaign, "brand");
}

function testManualFillsGap() {
  const base = detectAttributionFromUrl({ searchParams: {} });
  assert.equal(base.acquisitionSource, "direct");
  const withManual = applyManualAcquisitionSource(base, "Phone Call");
  assert.equal(withManual.acquisitionSource, "manual");
  assert.equal(withManual.manualSource, "Phone Call");
}

function testManualDoesNotOverrideUtm() {
  const utm = detectAttributionFromUrl({
    searchParams: { utm_source: "sms" },
  });
  const withManual = applyManualAcquisitionSource(utm, "Walk In");
  assert.equal(withManual.acquisitionSource, "utm");
  assert.equal(withManual.manualSource, "Walk In");
}

function testRedeemPriorityManualWins() {
  const resolved = resolveRedeemCodePriority({
    manualCode: "SAVE10",
    referralRef: "REZA1404",
  });
  assert.equal(resolved.source, "manual");
  assert.equal(resolved.code, "SAVE10");
}

function testFlatMetadataKeys() {
  const attr = detectAttributionFromUrl({
    searchParams: {
      utm_source: "instagram",
      utm_medium: "story",
      utm_campaign: "summer",
      utm_content: "cta1",
      utm_term: "exam",
    },
  });
  const flat = toRegistrationAttributionFlat(attr);
  assert.equal(flat.utmSource, "instagram");
  assert.equal(flat.acquisitionSource, "utm");
  assert.ok(flat.firstVisitAt);
}

function testResolveSourceHelpers() {
  assert.equal(
    resolveAcquisitionSource({
      utmSource: null,
      referralCode: "X",
      qrCampaign: "q",
      qrIdentifier: null,
      manualSource: "SMS",
    }),
    "referral",
  );
}

function testSanitizeStripsClientOwnerFields() {
  const spoofed = detectAttributionFromUrl({
    searchParams: { ref: "CODE1" },
  });
  spoofed.referralOwner = "Hacker Name";
  spoofed.qrOwner = "Fake Owner";
  const clean = sanitizeClientAttribution(spoofed);
  assert.ok(clean);
  assert.equal(clean.referralOwner, null);
  assert.equal(clean.qrOwner, null);
  assert.equal(clean.referralCode, "CODE1");
}

function testLegacyUnversionedAttributionParses() {
  const legacy = {
    acquisitionSource: "utm",
    utmSource: "instagram",
    referralCode: null,
    referralOwner: "Old Owner",
  };
  const parsed = parseAttributionFromUnknown(legacy);
  assert.ok(parsed);
  assert.equal(parsed.schemaVersion, ATTRIBUTION_SCHEMA_VERSION);
  assert.equal(parsed.utmSource, "instagram");
  const patch = attributionToMetadataPatch(parsed);
  assert.equal(patch.attributionSchemaVersion, ATTRIBUTION_SCHEMA_VERSION);
}

function testLegacyUnversionedLeadLinkParses() {
  const metadata = {
    leadLink: {
      leadId: "lead_1",
      leadOwnerId: null,
      leadOwnerName: "Ali",
      pipelineId: null,
      pipelineName: null,
      stageId: null,
      stageName: null,
      leadSource: null,
      leadSourceType: null,
      assignedStaffId: null,
      assignedStaffName: null,
      matchedBy: "mobile",
      linkedAt: "2026-01-01T00:00:00.000Z",
    },
  };
  const parsed = parseLeadLinkFromMetadata(metadata);
  assert.ok(parsed);
  assert.equal(parsed.schemaVersion, LEAD_LINK_SCHEMA_VERSION);
  assert.equal(parsed.leadId, "lead_1");
  const patch = leadLinkToMetadataPatch(parsed);
  assert.equal(patch.leadLinkSchemaVersion, LEAD_LINK_SCHEMA_VERSION);
}

testUtmPriority();
testReferralWhenNoUtm();
testQrWhenNoUtmOrRef();
testFirstTouchMerge();
testManualFillsGap();
testManualDoesNotOverrideUtm();
testRedeemPriorityManualWins();
testFlatMetadataKeys();
testResolveSourceHelpers();
testSanitizeStripsClientOwnerFields();
testLegacyUnversionedAttributionParses();
testLegacyUnversionedLeadLinkParses();
console.log("registration-attribution-lead-link-unit-tests: ok");
