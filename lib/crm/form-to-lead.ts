/**
 * After successful form submission: create/link lead + enqueue domain event.
 * Runs outside the capacity transaction.
 */

import type { Prisma } from "@/generated/prisma/client";
import {
  DomainEventType,
  FormFieldSemantic,
  LeadSourceType,
} from "@/generated/prisma/enums";
import { parseFormCrmSettings } from "@/lib/crm/form-crm-settings";
import { upsertLead } from "@/lib/crm/leads";
import { recordCrmActivity } from "@/lib/crm/activity";
import { CrmActivityType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function processFormSubmissionCrm(params: {
  organizationId: string;
  submissionId: string;
  formId: string;
  formVersionId: string;
  branchId: string;
}): Promise<void> {
  try {
    const version = await prisma.formVersion.findFirst({
      where: {
        id: params.formVersionId,
        organizationId: params.organizationId,
      },
      select: {
        settings: true,
        createLeadOnSubmit: true,
        leadSource: true,
        fields: {
          select: { id: true, fieldKey: true, semantic: true },
        },
      },
    });
    if (!version) return;

    const crm = parseFormCrmSettings(version.settings, {
      createLeadOnSubmit: version.createLeadOnSubmit,
      leadSource: version.leadSource,
    });

    const submission = await prisma.formSubmission.findFirst({
      where: {
        id: params.submissionId,
        organizationId: params.organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        leadId: true,
        normalizedMobile: true,
        mobile: true,
        mobileRaw: true,
        email: true,
        answers: {
          select: {
            fieldId: true,
            fieldKey: true,
            valueText: true,
            valueLongText: true,
          },
        },
      },
    });
    if (!submission) return;

    // Always enqueue form event for automation (idempotent aggregate).
    const existingEvent = await prisma.domainEventOutbox.findFirst({
      where: {
        organizationId: params.organizationId,
        eventType: DomainEventType.FORM_SUBMISSION_RECEIVED,
        aggregateType: "FormSubmission",
        aggregateId: submission.id,
      },
      select: { id: true },
    });
    if (!existingEvent) {
      await prisma.domainEventOutbox.create({
        data: {
          organizationId: params.organizationId,
          branchId: params.branchId,
          eventType: DomainEventType.FORM_SUBMISSION_RECEIVED,
          aggregateType: "FormSubmission",
          aggregateId: submission.id,
          payload: {
            submissionId: submission.id,
            formId: params.formId,
            formVersionId: params.formVersionId,
          } satisfies Prisma.InputJsonObject,
        },
      });
    }

    if (!crm.createLeadOnSubmit) return;
    if (submission.leadId) return;

    const semanticMap = new Map(
      version.fields.map((f) => [f.id, f.semantic] as const),
    );
    let firstName = "";
    let lastName = "";
    let fatherName: string | null = null;
    let school: string | null = null;
    let gradeLevel: string | null = null;
    let nationalCode: string | null = null;

    for (const answer of submission.answers) {
      const semantic = semanticMap.get(answer.fieldId) ?? FormFieldSemantic.NONE;
      const text = (answer.valueText ?? answer.valueLongText ?? "").trim();
      if (!text) continue;
      switch (semantic) {
        case FormFieldSemantic.FIRST_NAME:
          firstName = text;
          break;
        case FormFieldSemantic.LAST_NAME:
          lastName = text;
          break;
        case FormFieldSemantic.FATHER_NAME:
          fatherName = text;
          break;
        case FormFieldSemantic.SCHOOL:
          school = text;
          break;
        case FormFieldSemantic.GRADE:
          gradeLevel = text;
          break;
        default:
          break;
      }
    }

    const mobile =
      submission.normalizedMobile ?? submission.mobile ?? "";
    if (!mobile || !firstName || !lastName) return;

    const result = await upsertLead({
      organizationId: params.organizationId,
      branchId: params.branchId,
      firstName,
      lastName,
      fatherName,
      school,
      gradeLevel,
      nationalCode,
      mobile,
      mobileRaw: submission.mobileRaw ?? mobile,
      email: submission.email,
      source: crm.leadSourceLabel,
      sourceType: LeadSourceType.FORM,
      sourceFormSubmissionId: submission.id,
      pipelineId: crm.pipelineId,
      stageId: crm.initialStageId,
      ownerUserId: crm.assignToUserId,
      applyScoring: crm.applyLeadScoring,
      createInitialTask: crm.createInitialTask,
      initialTaskTitle: crm.initialTaskTitle,
      initialTaskDueMinutes: crm.initialTaskDueMinutes,
    });

    if (!result.ok) return;

    await prisma.formSubmission.update({
      where: { id: submission.id },
      data: {
        leadId: result.leadId,
        existsInCrm: true,
        matchedCrmLeadId: result.leadId,
      },
    });

    await recordCrmActivity({
      organizationId: params.organizationId,
      leadId: result.leadId,
      activityType: CrmActivityType.FORM_SUBMITTED,
      title: "پاسخ فرم ثبت شد",
      relatedFormSubmissionId: submission.id,
    });

    if (result.created) {
      const existingLeadEvent = await prisma.domainEventOutbox.findFirst({
        where: {
          organizationId: params.organizationId,
          eventType: DomainEventType.FORM_LEAD_CREATED,
          aggregateType: "Lead",
          aggregateId: result.leadId,
        },
        select: { id: true },
      });
      if (!existingLeadEvent) {
        await prisma.domainEventOutbox.create({
          data: {
            organizationId: params.organizationId,
            branchId: params.branchId,
            eventType: DomainEventType.FORM_LEAD_CREATED,
            aggregateType: "Lead",
            aggregateId: result.leadId,
            payload: {
              leadId: result.leadId,
              submissionId: submission.id,
              formId: params.formId,
            } satisfies Prisma.InputJsonObject,
          },
        });
      }
    }
  } catch {
    // Never fail the public form path.
  }
}
