/**
 * RegistrationService — create registration, CRM lead, payment intent boundary.
 */

import {
  CrmActivityType,
  LeadSourceType,
  RegistrationParentRelationship,
  RegistrationStatus,
  ServiceInterest,
} from "@/generated/prisma/enums";
import { recordCrmActivity } from "@/lib/crm/activity";
import { upsertLead } from "@/lib/crm/leads";
import { normalizeEmail } from "@/lib/forms/normalize-email";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { validateIranianNationalId } from "@/lib/forms/validate-national-id";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import { getRegistrationCatalog } from "@/lib/registration/catalog-registry";
import { nextRegistrationNumber } from "@/lib/registration/number-generator";
import { startCheckoutForRegistration } from "@/lib/payment/service";
import type {
  CreateRegistrationInput,
  RegistrationPublicView,
} from "@/lib/registration/types";
import { REGISTRATION_STATUS_LABELS } from "@/lib/registration/types";
import {
  birthDateToUtcDate,
  resolvePricing,
  validateCreateRegistrationInput,
} from "@/lib/registration/validate";

async function resolvePublicBranchId(organizationId: string): Promise<string> {
  const branch = await prisma.branch.findFirst({
    where: { organizationId, isActive: true, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!branch) {
    throw new Error("هیچ شعبه فعالی برای سازمان یافت نشد.");
  }
  return branch.id;
}

export type CreateRegistrationResult =
  | {
      ok: true;
      registrationId: string;
      registrationNumber: string;
      status: RegistrationStatus;
      paymentMessage: string;
      checkoutUrl: string | null;
      trackingCode: string | null;
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createRegistration(
  input: CreateRegistrationInput,
): Promise<CreateRegistrationResult> {
  const validated = validateCreateRegistrationInput(input);
  if (!validated.ok) {
    return {
      ok: false,
      error: validated.error,
      fieldErrors: validated.fieldErrors,
    };
  }

  const catalog = getRegistrationCatalog(input.flowKey);
  if (!catalog) {
    return { ok: false, error: "جریان ثبت‌نام یافت نشد." };
  }

  const pricing = resolvePricing(input.flowKey, {
    productKey: input.details.productKey,
    sessionKey: input.details.sessionKey,
    packageKey: input.details.packageKey,
    venueBranchKey: input.details.venueBranchKey,
    discountCode: input.details.discountCode ?? "",
  });
  if (!pricing.ok) {
    return { ok: false, error: pricing.error };
  }

  const national = validateIranianNationalId(input.student.nationalCode);
  if (!national.ok) {
    return {
      ok: false,
      error: national.error,
      fieldErrors: { nationalCode: national.error },
    };
  }

  const mobile = normalizeIranianMobile(input.parent.mobile);
  if (!mobile.ok) {
    return {
      ok: false,
      error: mobile.error,
      fieldErrors: { mobile: mobile.error },
    };
  }

  let secondaryNormalized: string | null = null;
  if (input.parent.secondaryMobile?.trim()) {
    const secondary = normalizeIranianMobile(input.parent.secondaryMobile);
    if (!secondary.ok) {
      return {
        ok: false,
        error: secondary.error,
        fieldErrors: { secondaryMobile: secondary.error },
      };
    }
    secondaryNormalized = secondary.normalized;
  }

  const email = normalizeEmail(input.parent.email ?? "");
  if (!email.ok) {
    return {
      ok: false,
      error: email.error,
      fieldErrors: { email: email.error },
    };
  }

  const organization = await getCurrentOrganization();
  const branchId = await resolvePublicBranchId(organization.id);
  const birthDate = birthDateToUtcDate(input.student.birthDate);

  const registration = await prisma.$transaction(async (tx) => {
    const number = await nextRegistrationNumber({
      organizationId: organization.id,
      tx,
    });

    return tx.registration.create({
      data: {
        organizationId: organization.id,
        branchId,
        registrationNumber: number.registrationNumber,
        status: RegistrationStatus.PENDING_PAYMENT,
        productType: catalog.productType,
        flowKey: catalog.flowKey,
        studentFirstName: input.student.firstName.trim(),
        studentLastName: input.student.lastName.trim(),
        nationalCode: national.normalized,
        birthDate,
        gender: input.student.gender,
        gradeLabel: input.student.gradeLabel.trim(),
        majorLabel: input.student.majorLabel?.trim() || null,
        schoolName: input.student.schoolName.trim(),
        province: input.student.province.trim(),
        city: input.student.city.trim(),
        parentName: input.parent.parentName.trim(),
        parentRelationship: input.parent.relationship,
        parentMobile: mobile.normalized,
        parentMobileNormalized: mobile.normalized,
        parentSecondaryMobile: secondaryNormalized,
        parentEmail: email.email,
        parentAddress: input.parent.address?.trim() || null,
        productKey: input.details.productKey,
        productTitle: pricing.productTitle,
        sessionKey: input.details.sessionKey,
        sessionTitle: pricing.sessionTitle,
        packageKey: input.details.packageKey,
        packageTitle: pricing.packageTitle,
        venueBranchKey: input.details.venueBranchKey,
        venueBranchTitle: pricing.venueBranchTitle,
        discountCode: pricing.discountCode,
        amountRials: pricing.amountRials,
        discountRials: pricing.discountRials,
        finalAmountRials: pricing.finalAmountRials,
      },
      select: {
        id: true,
        registrationNumber: true,
        status: true,
        finalAmountRials: true,
        productTitle: true,
      },
    });
  });

  const leadResult = await upsertLead({
    organizationId: organization.id,
    branchId,
    firstName: input.student.firstName.trim(),
    lastName: input.student.lastName.trim(),
    mobile: mobile.normalized,
    mobileRaw: input.parent.mobile,
    fatherName:
      input.parent.relationship === RegistrationParentRelationship.FATHER
        ? input.parent.parentName.trim()
        : null,
    school: input.student.schoolName.trim(),
    gradeLevel: input.student.gradeLabel.trim(),
    email: email.email,
    nationalCode: national.normalized,
    source: `REGISTRATION:${catalog.flowKey}`,
    sourceType: LeadSourceType.REGISTRATION,
    serviceInterest: ServiceInterest.EXAMS,
    applyScoring: true,
    createInitialTask: false,
  });

  if (leadResult.ok) {
    await prisma.lead.update({
      where: { id: leadResult.leadId },
      data: {
        city: input.student.city.trim(),
        province: input.student.province.trim(),
        gender: input.student.gender,
        birthDate,
        studyField: input.student.majorLabel?.trim() || null,
        nationalCode: national.normalized,
        school: input.student.schoolName.trim(),
        gradeLevel: input.student.gradeLabel.trim(),
      },
    });

    await prisma.registration.update({
      where: { id: registration.id },
      data: { leadId: leadResult.leadId },
    });

    await recordCrmActivity({
      organizationId: organization.id,
      leadId: leadResult.leadId,
      activityType: CrmActivityType.REGISTRATION_CREATED,
      title: "Registration Created",
      summary: `${registration.registrationNumber} · ${pricing.productTitle}`,
      metadata: {
        registrationId: registration.id,
        registrationNumber: registration.registrationNumber,
        flowKey: catalog.flowKey,
        finalAmountRials: registration.finalAmountRials,
        status: registration.status,
      },
    });
  }

  const payment = await startCheckoutForRegistration({
    organizationId: organization.id,
    registrationId: registration.id,
  });

  if (!payment.ok) {
    return { ok: false, error: payment.error };
  }

  return {
    ok: true,
    registrationId: registration.id,
    registrationNumber: registration.registrationNumber,
    status: registration.status,
    paymentMessage: "در حال انتقال به درگاه پرداخت…",
    checkoutUrl: payment.checkoutUrl,
    trackingCode: payment.trackingCode,
  };
}

export async function getRegistrationByNumber(
  registrationNumber: string,
): Promise<RegistrationPublicView | null> {
  const organization = await getCurrentOrganization();
  const row = await prisma.registration.findFirst({
    where: {
      organizationId: organization.id,
      registrationNumber: registrationNumber.trim(),
      deletedAt: null,
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    registrationNumber: row.registrationNumber,
    status: row.status,
    studentFullName: `${row.studentFirstName} ${row.studentLastName}`.trim(),
    productTitle: row.productTitle,
    sessionTitle: row.sessionTitle,
    packageTitle: row.packageTitle,
    venueBranchTitle: row.venueBranchTitle,
    amountRials: row.amountRials,
    discountRials: row.discountRials,
    finalAmountRials: row.finalAmountRials,
    trackingCode: row.trackingCode,
    createdAt: row.createdAt,
    paymentMessage:
      row.status === RegistrationStatus.PENDING_PAYMENT
        ? `وضعیت: ${REGISTRATION_STATUS_LABELS[row.status]} — در صورت نیاز می‌توانید پرداخت را از صفحه خطا دوباره انجام دهید.`
        : row.status === RegistrationStatus.COMPLETED ||
            row.status === RegistrationStatus.PAID
          ? `وضعیت: ${REGISTRATION_STATUS_LABELS[row.status]}`
          : `وضعیت: ${REGISTRATION_STATUS_LABELS[row.status]}`,
  };
}
