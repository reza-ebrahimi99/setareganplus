/**
 * CRM integration tests (requires DATABASE_URL + migrated schema).
 * NOT part of npm run build.
 *
 * Usage:
 *   npx prisma migrate deploy
 *   npm run test:crm
 */

import { randomBytes } from "node:crypto";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

import {
  DomainEventStatus,
  DomainEventType,
  FormPurpose,
  FormSubmissionStatus,
  FormVersionStatus,
  LeadSourceType,
} from "../generated/prisma/enums";
import {
  claimPendingDomainEvents,
  processDomainEvent,
  processPendingAutomationBatch,
} from "../lib/crm/automation-processor";
import { ensureDefaultPipeline } from "../lib/crm/pipeline";
import { upsertLead } from "../lib/crm/leads";
import { createCrmTask, completeCrmTask } from "../lib/crm/tasks";
import { processFormSubmissionCrm } from "../lib/crm/form-to-lead";
import { enqueueSms } from "../lib/communication/queue";
import { prisma } from "../lib/prisma";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

let passed = 0;
function ok(name: string) {
  passed += 1;
  console.log(`✓ ${name}`);
}

async function main() {
  const org = await prisma.organization.findFirst({
    where: { slug: "setareganplus", deletedAt: null },
    select: { id: true },
  });
  assert(org, "seed organization missing");
  const branch = await prisma.branch.findFirst({
    where: { organizationId: org.id, deletedAt: null },
    select: { id: true },
  });
  assert(branch, "branch missing");

  const suffix = randomBytes(3).toString("hex");
  const mobile = `0912${String(1000000 + (parseInt(suffix, 16) % 9000000)).padStart(7, "0")}`;

  // Pipeline
  const pipeline = await ensureDefaultPipeline(org.id);
  assert(pipeline.pipelineId, "pipeline id");
  assert(pipeline.newStageId, "new stage");
  ok("create default pipeline");

  const otherOrg = await prisma.organization.findFirst({
    where: { id: { not: org.id }, deletedAt: null },
    select: { id: true },
  });
  if (otherOrg) {
    const foreign = await prisma.crmPipelineStage.findFirst({
      where: { organizationId: otherOrg.id, deletedAt: null },
      select: { id: true },
    });
    if (foreign) {
      const reject = await upsertLead({
        organizationId: org.id,
        branchId: branch.id,
        firstName: "آزمون",
        lastName: "کراس",
        mobile,
        source: "TEST",
        sourceType: LeadSourceType.MANUAL,
        stageId: foreign.id,
      });
      assert(!reject.ok, "cross-org stage rejected");
      ok("cross-org stage rejected");
    } else {
      ok("cross-org stage skipped (no foreign stage)");
    }
  } else {
    ok("cross-org stage skipped (single org)");
  }

  // Lead create + mobile dedupe
  const a = await upsertLead({
    organizationId: org.id,
    branchId: branch.id,
    firstName: "علی",
    lastName: "آزمایشی",
    mobile,
    source: "TEST",
    sourceType: LeadSourceType.MANUAL,
    applyScoring: true,
  });
  assert(a.ok && a.created, "lead created");
  const b = await upsertLead({
    organizationId: org.id,
    branchId: branch.id,
    firstName: "علی",
    lastName: "آزمایشی",
    mobile,
    source: "TEST",
    sourceType: LeadSourceType.MANUAL,
  });
  assert(b.ok && !b.created && b.leadId === a.leadId, "mobile dedupe");
  ok("deterministic mobile dedupe");

  // Ambiguous match: second lead same mobile shouldn't happen via upsert (updates same)
  // Create forced second lead with same mobile to simulate ambiguity path
  const forced = await prisma.lead.create({
    data: {
      organizationId: org.id,
      branchId: branch.id,
      firstName: "دیگر",
      lastName: "شخص",
      mobile,
      mobileRaw: mobile,
      normalizedMobile: mobile,
      source: "FORCED",
      sourceType: LeadSourceType.MANUAL,
      pipelineId: pipeline.pipelineId,
      stageId: pipeline.newStageId,
    },
  });
  const ambiguousMobile = `0913${suffix}`.slice(0, 11).padEnd(11, "0");
  await prisma.lead.create({
    data: {
      organizationId: org.id,
      branchId: branch.id,
      firstName: "یک",
      lastName: "الف",
      mobile: ambiguousMobile,
      mobileRaw: ambiguousMobile,
      normalizedMobile: ambiguousMobile,
      source: "A",
      sourceType: LeadSourceType.MANUAL,
      pipelineId: pipeline.pipelineId,
      stageId: pipeline.newStageId,
    },
  });
  await prisma.lead.create({
    data: {
      organizationId: org.id,
      branchId: branch.id,
      firstName: "دو",
      lastName: "ب",
      mobile: ambiguousMobile,
      mobileRaw: ambiguousMobile,
      normalizedMobile: ambiguousMobile,
      source: "B",
      sourceType: LeadSourceType.MANUAL,
      pipelineId: pipeline.pipelineId,
      stageId: pipeline.newStageId,
    },
  });
  const amb = await upsertLead({
    organizationId: org.id,
    branchId: branch.id,
    firstName: "سه",
    lastName: "ج",
    mobile: ambiguousMobile,
    source: "C",
    sourceType: LeadSourceType.MANUAL,
  });
  assert(amb.ok && amb.created, "ambiguous match creates new lead");
  ok("ambiguous match does not auto-merge");

  // Form submission → one lead
  const form = await prisma.form.create({
    data: {
      organizationId: org.id,
      slug: `crm-form-${suffix}`,
      purpose: FormPurpose.CONSULTATION,
    },
  });
  const version = await prisma.formVersion.create({
    data: {
      organizationId: org.id,
      formId: form.id,
      versionNumber: 1,
      status: FormVersionStatus.PUBLISHED,
      title: "CRM Form",
      confirmationMessage: "ok",
      createLeadOnSubmit: true,
      leadSource: "CRM_TEST_FORM",
      settings: { crm: { createLeadOnSubmit: true, createInitialTask: true } },
    },
  });
  const formMobile = `0914${suffix}`.slice(0, 11).padEnd(11, "0");
  const fieldFirst = await prisma.formField.create({
    data: {
      organizationId: org.id,
      formVersionId: version.id,
      fieldKey: "first_name",
      sortOrder: 1,
      type: "SHORT_TEXT",
      semantic: "FIRST_NAME",
      label: "نام",
      required: true,
    },
  });
  const fieldLast = await prisma.formField.create({
    data: {
      organizationId: org.id,
      formVersionId: version.id,
      fieldKey: "last_name",
      sortOrder: 2,
      type: "SHORT_TEXT",
      semantic: "LAST_NAME",
      label: "نام خانوادگی",
      required: true,
    },
  });
  const submission = await prisma.formSubmission.create({
    data: {
      organizationId: org.id,
      branchId: branch.id,
      formId: form.id,
      formVersionId: version.id,
      status: FormSubmissionStatus.RECEIVED,
      normalizedMobile: formMobile,
      mobile: formMobile,
    },
  });
  await prisma.formAnswer.createMany({
    data: [
      {
        organizationId: org.id,
        submissionId: submission.id,
        fieldId: fieldFirst.id,
        fieldKey: "first_name",
        valueText: "سارا",
      },
      {
        organizationId: org.id,
        submissionId: submission.id,
        fieldId: fieldLast.id,
        fieldKey: "last_name",
        valueText: "تستی",
      },
    ],
  });

  await processFormSubmissionCrm({
    organizationId: org.id,
    submissionId: submission.id,
    formId: form.id,
    formVersionId: version.id,
    branchId: branch.id,
  });
  const linked = await prisma.formSubmission.findFirst({
    where: { id: submission.id },
    select: { leadId: true },
  });
  assert(linked?.leadId, "form created lead");
  await processFormSubmissionCrm({
    organizationId: org.id,
    submissionId: submission.id,
    formId: form.id,
    formVersionId: version.id,
    branchId: branch.id,
  });
  const count = await prisma.lead.count({
    where: {
      organizationId: org.id,
      sourceFormSubmissionId: submission.id,
      deletedAt: null,
    },
  });
  assert(count === 1, "repeated processing one lead");
  ok("form submission creates one lead + idempotent");

  // Tasks idempotency
  const task1 = await createCrmTask({
    organizationId: org.id,
    leadId: linked.leadId!,
    title: "تماس",
    idempotencyKey: `crm-test-task-${suffix}`,
  });
  const task2 = await createCrmTask({
    organizationId: org.id,
    leadId: linked.leadId!,
    title: "تماس",
    idempotencyKey: `crm-test-task-${suffix}`,
  });
  assert(task1.created && !task2.created && task1.id === task2.id, "task idempotent");
  await completeCrmTask({
    organizationId: org.id,
    taskId: task1.id,
  });
  const activity = await prisma.crmActivity.findFirst({
    where: {
      organizationId: org.id,
      relatedTaskId: task1.id,
      activityType: "TASK_COMPLETED",
    },
  });
  assert(activity, "task completion activity");
  ok("automation task idempotency + completion activity");

  // Automation execution idempotency via domain event
  const event = await prisma.domainEventOutbox.create({
    data: {
      organizationId: org.id,
      branchId: branch.id,
      eventType: DomainEventType.FORM_SUBMISSION_RECEIVED,
      aggregateType: "FormSubmission",
      aggregateId: submission.id,
      payload: {
        submissionId: submission.id,
        formId: form.id,
        formVersionId: version.id,
      },
    },
  });
  const rule = await prisma.automationRule.create({
    data: {
      organizationId: org.id,
      name: `test-rule-${suffix}`,
      trigger: DomainEventType.FORM_SUBMISSION_RECEIVED,
      isEnabled: true,
      conditions: {},
      actionConfig: {
        actions: [
          {
            type: "CREATE_TASK",
            title: "اتوماسیون تست",
            dueMinutes: 30,
          },
        ],
      },
    },
  });

  await prisma.domainEventOutbox.update({
    where: { id: event.id },
    data: { status: DomainEventStatus.PROCESSING, attemptCount: 1 },
  });
  await processDomainEvent(event.id);
  await prisma.domainEventOutbox.update({
    where: { id: event.id },
    data: {
      status: DomainEventStatus.PROCESSING,
      attemptCount: 2,
      processedAt: null,
    },
  });
  await processDomainEvent(event.id);
  const execCount = await prisma.automationExecution.count({
    where: {
      organizationId: org.id,
      automationRuleId: rule.id,
      domainEventId: event.id,
      status: "SUCCEEDED",
    },
  });
  assert(execCount === 1, "execution idempotent");
  ok("automation execution idempotency");

  // SMS enqueue action path via enqueueSms idempotency
  const sms1 = await enqueueSms({
    organizationId: org.id,
    toMobile: formMobile,
    body: "تست CRM",
    purpose: "crm_test",
    idempotencyKey: `crm-sms-${suffix}`,
  });
  const sms2 = await enqueueSms({
    organizationId: org.id,
    toMobile: formMobile,
    body: "تست CRM2",
    purpose: "crm_test",
    idempotencyKey: `crm-sms-${suffix}`,
  });
  assert(sms1.ok && sms2.ok && !sms2.created, "sms idempotent");
  ok("SMS enqueue idempotency");

  // Claim batch smoke
  const claimed = await claimPendingDomainEvents(5);
  assert(Array.isArray(claimed), "claimed array");
  await processPendingAutomationBatch(5);
  ok("worker claim/process batch");

  // Cleanup
  await prisma.automationExecution.deleteMany({
    where: { organizationId: org.id, automationRuleId: rule.id },
  });
  await prisma.automationRule.delete({ where: { id: rule.id } });
  await prisma.smsMessage.deleteMany({
    where: { organizationId: org.id, idempotencyKey: `crm-sms-${suffix}` },
  });
  await prisma.crmActivity.deleteMany({
    where: { organizationId: org.id, leadId: { in: [a.leadId, linked.leadId!, forced.id] } },
  });
  await prisma.crmTask.deleteMany({
    where: { organizationId: org.id, leadId: { in: [a.leadId, linked.leadId!] } },
  });
  await prisma.formAnswer.deleteMany({
    where: { organizationId: org.id, submissionId: submission.id },
  });
  await prisma.formSubmission.delete({ where: { id: submission.id } });
  await prisma.formField.deleteMany({
    where: { organizationId: org.id, formVersionId: version.id },
  });
  await prisma.formVersion.delete({ where: { id: version.id } });
  await prisma.form.delete({ where: { id: form.id } });
  await prisma.domainEventOutbox.deleteMany({
    where: {
      organizationId: org.id,
      aggregateId: { in: [submission.id, linked.leadId!] },
    },
  });
  await prisma.lead.deleteMany({
    where: {
      organizationId: org.id,
      OR: [
        { id: a.leadId },
        { id: forced.id },
        { id: linked.leadId! },
        { id: amb.ok ? amb.leadId : "" },
        { normalizedMobile: ambiguousMobile },
      ],
    },
  });

  console.log(`\nAll ${passed} CRM integration checks passed.`);
}

main()
  .catch((error) => {
    console.error("CRM integration tests failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
