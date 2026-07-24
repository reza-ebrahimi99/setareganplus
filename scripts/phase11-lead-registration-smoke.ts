/**
 * Phase 11 production smoke: Lead → Registration → Payment → Timeline → Report.
 *
 * Creates a disposable org, runs the chain, cleans up.
 * Requires: DATABASE_URL (migrated). Provider defaults to mock.
 *
 * Run: npx tsx --env-file=.env scripts/phase11-lead-registration-smoke.ts
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error(
      "phase11-lead-registration-smoke SKIPPED: DATABASE_URL is not configured.",
    );
    process.exit(2);
  }

  process.env.STAROS_PAYMENT_PROVIDER =
    process.env.STAROS_PAYMENT_PROVIDER || "mock";

  const {
    LeadSourceType,
    LeadStatus,
    PaymentStatus,
    RegistrationPaymentStatus,
    RegistrationProductType,
    RegistrationStatus,
  } = await import("../generated/prisma/enums");
  const { prisma } = await import("../lib/prisma");
  const { ensureDefaultPipeline } = await import("../lib/crm/pipeline");
  const {
    findLeadForRegistration,
    buildLeadLinkSnapshot,
    leadLinkToMetadataPatch,
    recordRegistrationLeadTimeline,
    advanceLeadStageForRegistration,
    parseLeadLinkFromMetadata,
  } = await import("../lib/registration/lead-link");
  const {
    sanitizeClientAttribution,
    detectAttributionFromUrl,
    attributionToMetadataPatch,
  } = await import("../lib/registration/attribution");
  const { startCheckoutForRegistration, verifyPaymentCallback } = await import(
    "../lib/payment/service"
  );
  const { getLeadRegistrationConversionReport } = await import(
    "../lib/registration/lead-conversion-analytics"
  );

  const suffix = randomBytes(4).toString("hex");
  const mobile = `0912${suffix.replace(/\D/g, "").padEnd(7, "0").slice(0, 7)}`;
  const nationalCode = "0013542419";

  async function cleanup(organizationId: string) {
    await prisma.crmActivity.deleteMany({ where: { organizationId } });
    await prisma.paymentEventLog.deleteMany({ where: { organizationId } });
    await prisma.paymentSession.deleteMany({ where: { organizationId } });
    await prisma.paymentIntent.deleteMany({ where: { organizationId } });
    await prisma.registrationActivity.deleteMany({ where: { organizationId } });
    await prisma.registration.deleteMany({ where: { organizationId } });
    await prisma.lead.deleteMany({ where: { organizationId } });
    await prisma.crmPipelineStage.deleteMany({ where: { organizationId } });
    await prisma.crmPipeline.deleteMany({ where: { organizationId } });
    await prisma.branch.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
  }

  const org = await prisma.organization.create({
    data: {
      name: `Phase11 Smoke ${suffix}`,
      slug: `phase11-smoke-${suffix}`,
    },
  });
  const branch = await prisma.branch.create({
    data: {
      organizationId: org.id,
      name: "Smoke Branch",
      slug: `phase11-branch-${suffix}`,
    },
  });

  const organizationId = org.id;
  try {
    const pipeline = await ensureDefaultPipeline(org.id);
    assert.ok(pipeline.stageByCode.new, "default stage new missing");
    assert.ok(pipeline.stageByCode.decision, "default stage decision missing");
    assert.ok(pipeline.stageByCode.won, "default stage won missing");

    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        branchId: branch.id,
        firstName: "Smoke",
        lastName: "Lead",
        mobile,
        mobileRaw: mobile,
        normalizedMobile: mobile,
        nationalCode,
        status: LeadStatus.NEW,
        source: "SMOKE_TEST",
        sourceType: LeadSourceType.OTHER,
        pipelineId: pipeline.pipelineId,
        stageId: pipeline.newStageId,
      },
    });

    await prisma.lead.create({
      data: {
        organizationId: org.id,
        branchId: branch.id,
        firstName: "Dup",
        lastName: "Lead",
        mobile,
        mobileRaw: mobile,
        normalizedMobile: mobile,
        status: LeadStatus.NEW,
        source: "SMOKE_TEST",
        sourceType: LeadSourceType.OTHER,
        pipelineId: pipeline.pipelineId,
        stageId: pipeline.newStageId,
      },
    });

    const ambiguous = await findLeadForRegistration({
      organizationId: org.id,
      mobile,
    });
    assert.equal(ambiguous, null, "ambiguous mobile must not auto-match");

    const byNational = await findLeadForRegistration({
      organizationId: org.id,
      nationalCode: "۰۰۱۳۵۴۲۴۱۹",
    });
    assert.ok(byNational);
    assert.equal(byNational!.matchedBy, "nationalCode");
    assert.equal(byNational!.id, lead.id);

    const byId = await findLeadForRegistration({
      organizationId: org.id,
      leadId: lead.id,
    });
    assert.ok(byId);
    assert.equal(byId!.matchedBy, "leadId");

    const spoofed = detectAttributionFromUrl({
      searchParams: { ref: "SMOKE1", utm_source: "instagram" },
    });
    spoofed.referralOwner = "Client Spoof";
    const cleanAttr = sanitizeClientAttribution(spoofed);
    assert.ok(cleanAttr);
    assert.equal(cleanAttr!.referralOwner, null);

    const snapshot = await buildLeadLinkSnapshot({
      organizationId: org.id,
      leadId: lead.id,
      matchedBy: "nationalCode",
    });
    assert.ok(snapshot);
    assert.equal(snapshot!.schemaVersion, 1);

    const registration = await prisma.registration.create({
      data: {
        organizationId: org.id,
        branchId: branch.id,
        registrationNumber: `REG-SMOKE-${suffix}`,
        status: RegistrationStatus.WAITING_PAYMENT,
        paymentStatus: RegistrationPaymentStatus.AWAITING,
        productType: RegistrationProductType.COURSE,
        flowKey: "smoke-flow",
        leadId: lead.id,
        studentFirstName: "Smoke",
        studentLastName: "Student",
        nationalCode,
        parentMobile: mobile,
        parentMobileNormalized: mobile,
        amountRials: 1_000_000,
        discountRials: 0,
        finalAmountRials: 1_000_000,
        metadata: JSON.parse(
          JSON.stringify({
            ...leadLinkToMetadataPatch(snapshot!, cleanAttr),
            ...attributionToMetadataPatch(cleanAttr!),
          }),
        ),
      },
    });

    const parsedLink = parseLeadLinkFromMetadata(registration.metadata);
    assert.ok(parsedLink);
    assert.equal(parsedLink!.leadId, lead.id);

    await recordRegistrationLeadTimeline({
      organizationId: org.id,
      leadId: lead.id,
      registrationId: registration.id,
      registrationNumber: registration.registrationNumber,
      flowKey: "smoke-flow",
      events: [
        { kind: "started" },
        { kind: "payment_started", summary: "checkout" },
      ],
    });
    await recordRegistrationLeadTimeline({
      organizationId: org.id,
      leadId: lead.id,
      registrationId: registration.id,
      registrationNumber: registration.registrationNumber,
      flowKey: "smoke-flow",
      events: [
        { kind: "started" },
        { kind: "payment_started", summary: "checkout" },
      ],
    });

    const startedCount = await prisma.crmActivity.count({
      where: {
        organizationId: org.id,
        leadId: lead.id,
        metadata: {
          path: ["timelineKind"],
          equals: "started",
        },
      },
    });
    assert.equal(startedCount, 1, "timeline started must be idempotent");

    await advanceLeadStageForRegistration({
      organizationId: org.id,
      leadId: lead.id,
      phase: "payment_pending",
    });
    const afterPending = await prisma.lead.findUniqueOrThrow({
      where: { id: lead.id },
      select: { stageId: true },
    });
    assert.equal(afterPending.stageId, pipeline.stageByCode.decision);

    const checkout = await startCheckoutForRegistration({
      organizationId: org.id,
      registrationId: registration.id,
    });
    if (!checkout.ok) {
      throw new Error(`checkout failed: ${checkout.error}`);
    }

    const session = await prisma.paymentSession.findFirstOrThrow({
      where: { paymentIntentId: checkout.paymentIntentId },
    });

    const first = await verifyPaymentCallback({
      organizationId: org.id,
      provider: "mock",
      callbackToken: session.callbackToken,
      callbackPayload: { outcome: "paid" },
    });
    if (!first.ok) {
      throw new Error(`first verify failed: ${first.error}`);
    }
    assert.equal(first.alreadyFinalized, false);
    assert.equal(first.status, PaymentStatus.PAID);

    const second = await verifyPaymentCallback({
      organizationId: org.id,
      provider: "mock",
      callbackToken: session.callbackToken,
      callbackPayload: { outcome: "paid" },
    });
    if (!second.ok) {
      throw new Error(`second verify failed: ${second.error}`);
    }
    assert.equal(second.alreadyFinalized, true);

    const paidActivities = await prisma.crmActivity.count({
      where: {
        organizationId: org.id,
        leadId: lead.id,
        metadata: {
          path: ["timelineKind"],
          equals: "payment_successful",
        },
      },
    });
    assert.equal(paidActivities, 1, "payment_successful timeline once");

    const completedActivities = await prisma.crmActivity.count({
      where: {
        organizationId: org.id,
        leadId: lead.id,
        metadata: {
          path: ["timelineKind"],
          equals: "completed",
        },
      },
    });
    assert.equal(completedActivities, 1, "completed timeline once");

    const wonLead = await prisma.lead.findUniqueOrThrow({
      where: { id: lead.id },
      select: { stageId: true },
    });
    assert.equal(wonLead.stageId, pipeline.stageByCode.won);

    const report = await getLeadRegistrationConversionReport(org.id);
    assert.ok(report.totalLeads >= 2);
    assert.ok(report.leadsWithRegistration >= 1);
    assert.ok(report.conversionRate >= 0);

    console.log("phase11-lead-registration-smoke PASS");
    console.log("  lead match ambiguity OK");
    console.log("  nationalCode normalization OK");
    console.log("  attribution sanitize + versioned leadLink OK");
    console.log("  timeline idempotency OK");
    console.log("  payment callback idempotency OK");
    console.log("  stage advance decision→won OK");
    console.log("  conversion report OK");
  } finally {
    await cleanup(organizationId);
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("phase11-lead-registration-smoke FAILED");
  console.error(error);
  process.exit(1);
});
