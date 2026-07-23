/**
 * Draft / progress autosave for the public registration wizard.
 */

import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import {
  RegistrationActivityType,
  RegistrationStatus,
} from "@/generated/prisma/enums";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import { recordRegistrationActivity } from "@/lib/registration/activity";
import { findRegistrationFlowBySlug } from "@/lib/registration/flows/public";
import { resolveRegistrationCatalog } from "@/lib/registration/flows/resolve-catalog";
import { nextRegistrationNumber } from "@/lib/registration/number-generator";
import {
  computeCompletionPercent,
  touchActivityNow,
} from "@/lib/registration/progress";
import { WIZARD_TOTAL_STEPS } from "@/lib/registration/status";
import type {
  DetailsStepInput,
  ParentStepInput,
  RegistrationFlowKey,
  StudentStepInput,
} from "@/lib/registration/types";
import { birthDateToUtcDate } from "@/lib/registration/validate";

export type SaveProgressInput = {
  flowKey: RegistrationFlowKey;
  resumeToken?: string | null;
  currentStep: number;
  lastCompletedStep: number;
  student: StudentStepInput;
  parent: ParentStepInput;
  details: DetailsStepInput;
  /** Document ids already attached (optional). */
  documentIds?: string[];
};

export type SaveProgressResult =
  | {
      ok: true;
      registrationId: string;
      registrationNumber: string;
      resumeToken: string;
      completionPercent: number;
      status: RegistrationStatus;
    }
  | { ok: false; error: string };

function newResumeToken(): string {
  return randomBytes(24).toString("hex");
}

async function resolvePublicBranchId(organizationId: string): Promise<string> {
  const branch = await prisma.branch.findFirst({
    where: { organizationId, isActive: true, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!branch) throw new Error("هیچ شعبه فعالی برای سازمان یافت نشد.");
  return branch.id;
}

function draftSnapshot(input: SaveProgressInput): Prisma.InputJsonValue {
  return {
    student: input.student,
    parent: input.parent,
    details: input.details,
    documentIds: input.documentIds ?? [],
    currentStep: input.currentStep,
    lastCompletedStep: input.lastCompletedStep,
  };
}

function mapFieldsFromDraft(input: SaveProgressInput) {
  const mobile = input.parent.mobile.trim()
    ? normalizeIranianMobile(input.parent.mobile)
    : null;

  return {
    studentFirstName: input.student.firstName.trim() || null,
    studentLastName: input.student.lastName.trim() || null,
    nationalCode: input.student.nationalCode.trim() || null,
    birthDate: input.student.birthDate
      ? birthDateToUtcDate(input.student.birthDate)
      : null,
    gender: input.student.gender || null,
    gradeLabel: input.student.gradeLabel.trim() || null,
    majorLabel: input.student.majorLabel.trim() || null,
    schoolName: input.student.schoolName.trim() || null,
    province: input.student.province.trim() || null,
    city: input.student.city.trim() || null,
    parentName: input.parent.parentName.trim() || null,
    parentRelationship: input.parent.relationship || null,
    parentMobile: mobile?.ok ? mobile.normalized : input.parent.mobile.trim() || null,
    parentMobileNormalized: mobile?.ok ? mobile.normalized : null,
    parentSecondaryMobile: input.parent.secondaryMobile.trim() || null,
    parentEmail: input.parent.email.trim() || null,
    parentAddress: input.parent.address.trim() || null,
    productKey: input.details.productKey || null,
    sessionKey: input.details.sessionKey || null,
    packageKey: input.details.packageKey || null,
    venueBranchKey: input.details.venueBranchKey || null,
    discountCode: input.details.discountCode.trim() || null,
  };
}

export async function saveRegistrationProgress(
  input: SaveProgressInput,
): Promise<SaveProgressResult> {
  const catalog = await resolveRegistrationCatalog(input.flowKey);
  if (!catalog) return { ok: false, error: "جریان ثبت‌نام یافت نشد." };

  const currentStep = Math.max(
    1,
    Math.min(input.currentStep, WIZARD_TOTAL_STEPS),
  );
  const lastCompletedStep = Math.max(
    0,
    Math.min(input.lastCompletedStep, WIZARD_TOTAL_STEPS),
  );
  const completionPercent = computeCompletionPercent(lastCompletedStep);
  const organization = await getCurrentOrganization();
  const branchId = await resolvePublicBranchId(organization.id);
  const dbFlow = await findRegistrationFlowBySlug(
    organization.id,
    catalog.flowKey,
  );
  const fields = mapFieldsFromDraft(input);
  const now = touchActivityNow();
  const flowLink = { registrationFlowId: dbFlow?.id ?? null };
  const existing = input.resumeToken
    ? await prisma.registration.findFirst({
        where: {
          organizationId: organization.id,
          resumeToken: input.resumeToken,
          deletedAt: null,
        },
      })
    : null;

  if (existing) {
    // Do not overwrite terminal / paid workflows via public autosave.
    if (
      existing.status === RegistrationStatus.APPROVED ||
      existing.status === RegistrationStatus.REJECTED ||
      existing.status === RegistrationStatus.CANCELLED ||
      existing.status === RegistrationStatus.WAITING_PAYMENT ||
      existing.status === RegistrationStatus.UNDER_REVIEW
    ) {
      return {
        ok: true,
        registrationId: existing.id,
        registrationNumber: existing.registrationNumber,
        resumeToken: existing.resumeToken ?? input.resumeToken!,
        completionPercent: existing.completionPercent,
        status: existing.status,
      };
    }

    const updated = await prisma.registration.update({
      where: { id: existing.id },
      data: {
        ...fields,
        ...flowLink,
        productType: catalog.productType,
        flowKey: catalog.flowKey,
        currentStep,
        lastCompletedStep,
        completionPercent,
        totalSteps: WIZARD_TOTAL_STEPS,
        lastActivityAt: now,
        status:
          lastCompletedStep >= WIZARD_TOTAL_STEPS
            ? existing.status
            : RegistrationStatus.INCOMPLETE,
        abandonedReason:
          lastCompletedStep > 0 && lastCompletedStep < WIZARD_TOTAL_STEPS
            ? `توقف در مرحله ${lastCompletedStep}`
            : null,
        wizardDraft: draftSnapshot(input),
      },
      select: {
        id: true,
        registrationNumber: true,
        resumeToken: true,
        completionPercent: true,
        status: true,
      },
    });

    await recordRegistrationActivity({
      organizationId: organization.id,
      registrationId: updated.id,
      activityType: RegistrationActivityType.PROGRESS_SAVED,
      title: "پیشرفت ذخیره شد",
      summary: `مرحله ${currentStep} · تکمیل ${completionPercent}٪`,
      metadata: { currentStep, lastCompletedStep, completionPercent },
    });

    return {
      ok: true,
      registrationId: updated.id,
      registrationNumber: updated.registrationNumber,
      resumeToken: updated.resumeToken!,
      completionPercent: updated.completionPercent,
      status: updated.status,
    };
  }

  const resumeToken = newResumeToken();
  const created = await prisma.$transaction(async (tx) => {
    const number = await nextRegistrationNumber({
      organizationId: organization.id,
      tx,
    });
    return tx.registration.create({
      data: {
        organizationId: organization.id,
        branchId,
        registrationNumber: number.registrationNumber,
        status:
          lastCompletedStep > 0
            ? RegistrationStatus.INCOMPLETE
            : RegistrationStatus.NEW,
        productType: catalog.productType,
        flowKey: catalog.flowKey,
        registrationFlowId: dbFlow?.id ?? null,
        resumeToken,
        currentStep,
        lastCompletedStep,
        completionPercent,
        totalSteps: WIZARD_TOTAL_STEPS,
        lastActivityAt: now,
        abandonedReason:
          lastCompletedStep > 0
            ? `توقف در مرحله ${lastCompletedStep}`
            : null,
        wizardDraft: draftSnapshot(input),
        ...fields,
      },
      select: {
        id: true,
        registrationNumber: true,
        resumeToken: true,
        completionPercent: true,
        status: true,
      },
    });
  });

  await recordRegistrationActivity({
    organizationId: organization.id,
    registrationId: created.id,
    activityType: RegistrationActivityType.CREATED,
    title: "ثبت‌نام آغاز شد",
    summary: created.registrationNumber,
  });

  return {
    ok: true,
    registrationId: created.id,
    registrationNumber: created.registrationNumber,
    resumeToken: created.resumeToken!,
    completionPercent: created.completionPercent,
    status: created.status,
  };
}

export async function loadRegistrationDraftByResumeToken(resumeToken: string) {
  const organization = await getCurrentOrganization();
  return prisma.registration.findFirst({
    where: {
      organizationId: organization.id,
      resumeToken: resumeToken.trim(),
      deletedAt: null,
    },
    include: {
      documents: {
        where: { deletedAt: null },
        include: {
          mediaAsset: {
            select: {
              id: true,
              storageKey: true,
              originalName: true,
              mimeType: true,
              altText: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}
