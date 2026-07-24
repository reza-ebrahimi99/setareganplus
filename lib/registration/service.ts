/**
 * RegistrationService — create/finalize registration, CRM lead, payment intent.
 */

import type { Prisma } from "@/generated/prisma/client";
import {
  CrmActivityType,
  DomainEventType,
  LeadSourceType,
  RegistrationActivityType,
  RegistrationFlowPaymentMode,
  RegistrationParentRelationship,
  RegistrationPaymentStatus,
  RegistrationStatus,
  ServiceInterest,
} from "@/generated/prisma/enums";
import { enqueueRegistrationCompletedSms } from "@/lib/communication/registration-sms";
import { recordCrmActivity } from "@/lib/crm/activity";
import { upsertLead } from "@/lib/crm/leads";
import { normalizeEmail } from "@/lib/forms/normalize-email";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { validateIranianNationalId } from "@/lib/forms/validate-national-id";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import { startCheckoutForRegistration } from "@/lib/payment/service";
import { recordRegistrationActivity } from "@/lib/registration/activity";
import { flowRequiresCheckout } from "@/lib/registration/flows/constants";
import { findRegistrationFlowBySlug } from "@/lib/registration/flows/public";
import { resolveRegistrationCatalog } from "@/lib/registration/flows/resolve-catalog";
import {
  ensureRegistrationFlowConfig,
  isRegistrationWindowOpen,
  remainingCapacity,
} from "@/lib/registration/flow-config";
import { nextRegistrationNumber } from "@/lib/registration/number-generator";
import { resolveRegistrationPricing } from "@/lib/registration/pricing";
import { computeCompletionPercent } from "@/lib/registration/progress";
import {
  REGISTRATION_STATUS_LABELS,
  WIZARD_TOTAL_STEPS,
} from "@/lib/registration/status";
import type {
  CreateRegistrationInput,
  RegistrationPublicView,
} from "@/lib/registration/types";
import {
  birthDateToUtcDate,
  validateCreateRegistrationInput,
} from "@/lib/registration/validate";
import { allocateUniqueTrackingCode } from "@/lib/tracking/public-tracking-code";

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
      resumeToken: string | null;
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createRegistration(
  input: CreateRegistrationInput,
): Promise<CreateRegistrationResult> {
  const catalog = await resolveRegistrationCatalog(input.flowKey);
  if (!catalog) {
    return { ok: false, error: "جریان ثبت‌نام یافت نشد." };
  }

  const validated = validateCreateRegistrationInput(input, catalog);
  if (!validated.ok) {
    return {
      ok: false,
      error: validated.error,
      fieldErrors: validated.fieldErrors,
    };
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

  const flow = await ensureRegistrationFlowConfig({
    organizationId: organization.id,
    flowKey: catalog.flowKey,
  });

  const window = isRegistrationWindowOpen(flow);
  if (!window.open) {
    if (window.reason === "not_started") {
      return {
        ok: false,
        error: "ثبت‌نام هنوز آغاز نشده است.",
      };
    }
    if (window.reason === "ended") {
      return { ok: false, error: "مهلت ثبت‌نام به پایان رسیده است." };
    }
    return { ok: false, error: "ثبت‌نام در حال حاضر غیرفعال است." };
  }

  if (flow.capacity != null && remainingCapacity(flow) === 0) {
    return { ok: false, error: "ظرفیت تکمیل شده است." };
  }

  const now = new Date();
  const pricing = resolveRegistrationPricing({
    flowKey: input.flowKey,
    details: {
      productKey: input.details.productKey,
      sessionKey: input.details.sessionKey,
      packageKey: input.details.packageKey,
      venueBranchKey: input.details.venueBranchKey,
      discountCode: input.details.discountCode ?? "",
    },
    flow,
    now,
  });
  if (!pricing.ok) {
    return { ok: false, error: pricing.error };
  }

  const dbFlow = await findRegistrationFlowBySlug(
    organization.id,
    catalog.flowKey,
  );
  const paymentMode =
    dbFlow?.paymentMode ?? RegistrationFlowPaymentMode.FIXED_PRICE;
  const skipOptional = Boolean(input.skipOptionalPayment);
  const needsCheckout = flowRequiresCheckout(paymentMode, {
    skipOptionalPayment: skipOptional,
  });

  const amountRials =
    dbFlow && !needsCheckout ? 0 : pricing.amountRials;
  const discountRials =
    dbFlow && !needsCheckout ? 0 : pricing.discountRials;
  const finalAmountRials =
    dbFlow && !needsCheckout ? 0 : pricing.finalAmountRials;

  const completionPercent = computeCompletionPercent(WIZARD_TOTAL_STEPS);

  const payload = {
    status: needsCheckout
      ? RegistrationStatus.WAITING_PAYMENT
      : RegistrationStatus.UNDER_REVIEW,
    paymentStatus: needsCheckout
      ? RegistrationPaymentStatus.AWAITING
      : RegistrationPaymentStatus.WAIVED,
    productType: catalog.productType,
    flowKey: catalog.flowKey,
    registrationFlowId: flow.id,
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
    packageTitle: dbFlow?.paymentTitle ?? pricing.packageTitle,
    venueBranchKey: input.details.venueBranchKey,
    venueBranchTitle: pricing.venueBranchTitle,
    discountCode: pricing.discountCode,
    amountRials,
    discountRials,
    finalAmountRials,
    currentStep: WIZARD_TOTAL_STEPS,
    lastCompletedStep: WIZARD_TOTAL_STEPS,
    completionPercent,
    totalSteps: WIZARD_TOTAL_STEPS,
    lastActivityAt: now,
    abandonedReason: null,
  };

  let registration: {
    id: string;
    registrationNumber: string;
    status: RegistrationStatus;
    finalAmountRials: number;
    productTitle: string | null;
    resumeToken: string | null;
    publicTrackingCode: string | null;
  };

  try {
    const existingDraft = input.resumeToken
      ? await prisma.registration.findFirst({
          where: {
            organizationId: organization.id,
            resumeToken: input.resumeToken,
            deletedAt: null,
          },
          select: {
            id: true,
            registrationNumber: true,
            resumeToken: true,
            publicTrackingCode: true,
          },
        })
      : null;

    if (existingDraft) {
      const publicTrackingCode =
        existingDraft.publicTrackingCode ??
        (await allocateUniqueTrackingCode({
          organizationId: organization.id,
          exists: async (code) => {
            const row = await prisma.registration.findFirst({
              where: {
                organizationId: organization.id,
                publicTrackingCode: code,
              },
              select: { id: true },
            });
            return Boolean(row);
          },
        }));

      registration = await prisma.registration.update({
        where: { id: existingDraft.id },
        data: {
          ...payload,
          publicTrackingCode,
        },
        select: {
          id: true,
          registrationNumber: true,
          status: true,
          finalAmountRials: true,
          productTitle: true,
          resumeToken: true,
          publicTrackingCode: true,
        },
      });
    } else {
      registration = await prisma.$transaction(async (tx) => {
        const number = await nextRegistrationNumber({
          organizationId: organization.id,
          tx,
        });

        const publicTrackingCode = await allocateUniqueTrackingCode({
          organizationId: organization.id,
          exists: async (code) => {
            const row = await tx.registration.findFirst({
              where: {
                organizationId: organization.id,
                publicTrackingCode: code,
              },
              select: { id: true },
            });
            return Boolean(row);
          },
        });

        return tx.registration.create({
          data: {
            organizationId: organization.id,
            branchId,
            registrationNumber: number.registrationNumber,
            ...payload,
            publicTrackingCode,
          },
          select: {
            id: true,
            registrationNumber: true,
            status: true,
            finalAmountRials: true,
            productTitle: true,
            resumeToken: true,
            publicTrackingCode: true,
          },
        });
      });
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "TRACKING_CODE_ALLOCATION_FAILED"
    ) {
      return {
        ok: false,
        error: "ثبت‌نام با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
      };
    }
    throw error;
  }

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

  try {
    const existingEvent = await prisma.domainEventOutbox.findFirst({
      where: {
        organizationId: organization.id,
        eventType: DomainEventType.REGISTRATION_COMPLETED,
        aggregateType: "Registration",
        aggregateId: registration.id,
      },
      select: { id: true },
    });
    if (!existingEvent) {
      await prisma.domainEventOutbox.create({
        data: {
          organizationId: organization.id,
          branchId,
          eventType: DomainEventType.REGISTRATION_COMPLETED,
          aggregateType: "Registration",
          aggregateId: registration.id,
          payload: {
            registrationId: registration.id,
            registrationNumber: registration.registrationNumber,
            flowKey: catalog.flowKey,
          } satisfies Prisma.InputJsonObject,
        },
      });
    }
  } catch (error) {
    console.error(
      "[registration] domain event outbox failed",
      error instanceof Error ? error.message : "unknown",
    );
  }

  void enqueueRegistrationCompletedSms({
    organizationId: organization.id,
    registrationId: registration.id,
  }).catch(() => {});

  if (!needsCheckout) {
    await recordRegistrationActivity({
      organizationId: organization.id,
      registrationId: registration.id,
      activityType: RegistrationActivityType.SYSTEM,
      title: "ثبت‌نام بدون پرداخت",
      summary:
        paymentMode === RegistrationFlowPaymentMode.FREE
          ? "جریان رایگان — پرداخت الزامی نیست"
          : "پرداخت اختیاری رد شد — ثبت‌نام قابل پیگیری است",
      metadata: { paymentMode, finalAmountRials },
    });

    return {
      ok: true,
      registrationId: registration.id,
      registrationNumber: registration.registrationNumber,
      status: registration.status,
      paymentMessage:
        paymentMode === RegistrationFlowPaymentMode.FREE
          ? "ثبت‌نام رایگان با موفقیت ثبت شد."
          : "ثبت‌نام بدون پرداخت ثبت شد؛ در صورت نیاز می‌توانید بعداً پرداخت کنید.",
      checkoutUrl: null,
      trackingCode: null,
      resumeToken: registration.resumeToken,
    };
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
    resumeToken: registration.resumeToken,
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
    include: {
      paymentIntents: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          receiptNumber: true,
          trackingCode: true,
          provider: true,
        },
      },
    },
  });
  if (!row) return null;

  const studentFullName =
    `${row.studentFirstName ?? ""} ${row.studentLastName ?? ""}`.trim() ||
    "—";
  const latestIntent = row.paymentIntents[0] ?? null;

  return {
    id: row.id,
    registrationNumber: row.registrationNumber,
    status: row.status,
    paymentStatus: row.paymentStatus,
    studentFullName,
    productTitle: row.productTitle ?? "—",
    sessionTitle: row.sessionTitle,
    packageTitle: row.packageTitle,
    venueBranchTitle: row.venueBranchTitle,
    amountRials: row.amountRials,
    discountRials: row.discountRials,
    finalAmountRials: row.finalAmountRials,
    publicTrackingCode: row.publicTrackingCode,
    trackingCode: row.trackingCode ?? latestIntent?.trackingCode ?? null,
    paymentReceiptNumber: latestIntent?.receiptNumber ?? null,
    paymentProvider: row.paymentProvider ?? latestIntent?.provider ?? null,
    createdAt: row.createdAt,
    paymentMessage:
      row.status === RegistrationStatus.WAITING_PAYMENT
        ? `وضعیت: ${REGISTRATION_STATUS_LABELS[row.status]} — در صورت نیاز می‌توانید پرداخت را دوباره انجام دهید.`
        : row.status === RegistrationStatus.APPROVED
          ? `وضعیت: ${REGISTRATION_STATUS_LABELS[row.status]}`
          : `وضعیت: ${REGISTRATION_STATUS_LABELS[row.status]}`,
  };
}
