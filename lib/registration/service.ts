/**
 * RegistrationService — create/finalize registration, CRM lead, payment intent.
 */

import type { Prisma } from "@/generated/prisma/client";
import {
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
import { upsertLead } from "@/lib/crm/leads";
import { normalizeEmail } from "@/lib/forms/normalize-email";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { validateIranianNationalId } from "@/lib/forms/validate-national-id";
import { loadPublicFormById } from "@/lib/forms/load-public-form";
import type { PreservedFieldValue } from "@/lib/forms/validate-public-submission";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import { startCheckoutForRegistration } from "@/lib/payment/service";
import { recordRegistrationActivity } from "@/lib/registration/activity";
import type { RegistrationAttribution } from "@/lib/registration/attribution";
import {
  attributionToMetadataPatch,
  parseAttributionFromUnknown,
  sanitizeClientAttribution,
} from "@/lib/registration/attribution";
import { partitionRegistrationFormFields } from "@/lib/registration/form-bridge";
import { persistRegistrationFormAnswers } from "@/lib/registration/persist-form-answers";
import {
  advanceLeadStageForRegistration,
  buildLeadLinkSnapshot,
  findDuplicateRegistrationForLead,
  findLeadForRegistration,
  leadLinkToMetadataPatch,
  recordRegistrationLeadTimeline,
} from "@/lib/registration/lead-link";
import { flowRequiresCheckout } from "@/lib/registration/flows/constants";
import { findRegistrationFlowBySlug } from "@/lib/registration/flows/public";
import { resolveRegistrationCatalog } from "@/lib/registration/flows/resolve-catalog";
import {
  isRegistrationWindowOpen,
  remainingCapacity,
} from "@/lib/registration/flow-config";
import { ensureRegistrationFlowConfig } from "@/lib/registration/flow-config-db";
import { nextRegistrationNumber } from "@/lib/registration/number-generator";
import { resolveRegistrationPricingAsync } from "@/lib/registration/pricing-async";
import {
  appliedPromotionsMetadata,
  recordPromotionUsages,
} from "@/lib/promotions/record-usage";
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

  let emailNormalized: string | null = null;
  if (input.parent.email?.trim()) {
    const email = normalizeEmail(input.parent.email);
    if (!email.ok) {
      return {
        ok: false,
        error: email.error,
        fieldErrors: { email: email.error },
      };
    }
    emailNormalized = email.email;
  }

  const organization = await getCurrentOrganization();
  const branchId = await resolvePublicBranchId(organization.id);
  const birthDate = input.student.birthDate
    ? birthDateToUtcDate(input.student.birthDate)
    : null;
  const formDriven = Boolean(input.linkedForm?.formId);
  const resolvedDetails = {
    productKey:
      input.details.productKey ||
      (formDriven ? (catalog.products[0]?.key ?? "") : ""),
    sessionKey:
      input.details.sessionKey ||
      (formDriven ? (catalog.sessions[0]?.key ?? "") : ""),
    packageKey:
      input.details.packageKey ||
      (formDriven ? (catalog.packages[0]?.key ?? "") : ""),
    venueBranchKey:
      input.details.venueBranchKey ||
      (formDriven ? (catalog.venueBranches[0]?.key ?? "") : ""),
    discountCode: input.details.discountCode ?? "",
  };

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

  // Idempotent seed of legacy catalog coupons into Promotion table.
  try {
    const { ensureLegacyCatalogPromotions } = await import(
      "@/lib/promotions/legacy"
    );
    await ensureLegacyCatalogPromotions(organization.id);
  } catch (error) {
    console.warn(
      "[registration] legacy coupon seed failed",
      error instanceof Error ? error.message : "unknown",
    );
  }

  const pricing = await resolveRegistrationPricingAsync({
    flowKey: input.flowKey,
    details: resolvedDetails,
    flow,
    now,
    catalog,
    organizationId: organization.id,
    nationalCode: national.normalized,
  });
  if (!pricing.ok) {
    return { ok: false, error: pricing.error };
  }

  const priorMatch = await findLeadForRegistration({
    organizationId: organization.id,
    leadId: input.leadId,
    mobile: input.parent.mobile,
    nationalCode: national.normalized,
    email: emailNormalized,
  });
  if (priorMatch) {
    const dup = await findDuplicateRegistrationForLead({
      organizationId: organization.id,
      leadId: priorMatch.id,
      flowKey: catalog.flowKey,
      excludeRegistrationId: input.resumeToken
        ? (
            await prisma.registration.findFirst({
              where: {
                organizationId: organization.id,
                resumeToken: input.resumeToken,
                deletedAt: null,
              },
              select: { id: true },
            })
          )?.id
        : null,
    });
    if (dup) {
      return {
        ok: false,
        error: `برای این متقاضی ثبت‌نام فعال دیگری وجود دارد (${dup.registrationNumber}).`,
      };
    }
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

  // Never trust client-supplied referralOwner / qrOwner / leadLink.
  const clientAttribution = sanitizeClientAttribution(input.attribution);

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
    gender: input.student.gender ?? null,
    gradeLabel: input.student.gradeLabel?.trim() || null,
    majorLabel: input.student.majorLabel?.trim() || null,
    schoolName: input.student.schoolName?.trim() || null,
    province: input.student.province?.trim() || null,
    city: input.student.city?.trim() || null,
    parentName: input.parent.parentName?.trim() || null,
    parentRelationship: input.parent.relationship ?? null,
    parentMobile: mobile.normalized,
    parentMobileNormalized: mobile.normalized,
    parentSecondaryMobile: secondaryNormalized,
    parentEmail: emailNormalized,
    parentAddress: input.parent.address?.trim() || null,
    productKey: resolvedDetails.productKey || null,
    productTitle: pricing.productTitle,
    sessionKey: resolvedDetails.sessionKey || null,
    sessionTitle: pricing.sessionTitle,
    packageKey: resolvedDetails.packageKey || null,
    packageTitle: dbFlow?.paymentTitle ?? pricing.packageTitle,
    venueBranchKey: resolvedDetails.venueBranchKey || null,
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
    metadata: {
      ...appliedPromotionsMetadata(pricing.appliedPromotions ?? [], {
        referralPromotionId: pricing.referralPromotionId,
        referralOwnerStaffId: pricing.referralOwnerStaffId,
      }),
      ...(clientAttribution
        ? attributionToMetadataPatch(clientAttribution)
        : {}),
    } as Prisma.InputJsonValue,
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

      const existingMetaRow = await prisma.registration.findFirst({
        where: { id: existingDraft.id },
        select: { metadata: true },
      });
      const prevMeta =
        existingMetaRow?.metadata &&
        typeof existingMetaRow.metadata === "object" &&
        !Array.isArray(existingMetaRow.metadata)
          ? (existingMetaRow.metadata as Record<string, unknown>)
          : {};

      registration = await prisma.registration.update({
        where: { id: existingDraft.id },
        data: {
          ...payload,
          publicTrackingCode,
          metadata: {
            ...prevMeta,
            ...appliedPromotionsMetadata(pricing.appliedPromotions ?? [], {
              referralPromotionId: pricing.referralPromotionId,
              referralOwnerStaffId: pricing.referralOwnerStaffId,
            }),
          } as Prisma.InputJsonValue,
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

  try {
    await recordPromotionUsages({
      organizationId: organization.id,
      registrationId: registration.id,
      nationalCode: national.normalized,
      applied: pricing.appliedPromotions ?? [],
    });
  } catch (error) {
    console.error(
      "[registration] promotion usage record failed",
      error instanceof Error ? error.message : "unknown",
    );
  }

  // Pre-detect existing lead (priority: leadId → mobile → national → email)
  // priorMatch already resolved before create for duplicate protection.

  const leadResult = await upsertLead({
    organizationId: organization.id,
    branchId,
    firstName: input.student.firstName.trim(),
    lastName: input.student.lastName.trim(),
    mobile: mobile.normalized,
    mobileRaw: input.parent.mobile,
    fatherName:
      input.parent.relationship === RegistrationParentRelationship.FATHER
        ? input.parent.parentName?.trim() || null
        : null,
    school: input.student.schoolName?.trim() || null,
    gradeLevel: input.student.gradeLabel?.trim() || null,
    email: emailNormalized,
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
        city: input.student.city?.trim() || null,
        province: input.student.province?.trim() || null,
        gender: input.student.gender ?? null,
        birthDate,
        studyField: input.student.majorLabel?.trim() || null,
        nationalCode: national.normalized,
        school: input.student.schoolName?.trim() || null,
        gradeLevel: input.student.gradeLabel?.trim() || null,
      },
    });

    const matchedBy = priorMatch?.id === leadResult.leadId
      ? priorMatch.matchedBy
      : leadResult.created
        ? ("created" as const)
        : ("mobile" as const);

    const leadSnapshot = await buildLeadLinkSnapshot({
      organizationId: organization.id,
      leadId: leadResult.leadId,
      matchedBy,
    });

    const existingMetaRow = await prisma.registration.findFirst({
      where: { id: registration.id },
      select: { metadata: true },
    });
    const prevMeta =
      existingMetaRow?.metadata &&
      typeof existingMetaRow.metadata === "object" &&
      !Array.isArray(existingMetaRow.metadata)
        ? (existingMetaRow.metadata as Record<string, unknown>)
        : {};

    const attribution: RegistrationAttribution | null =
      clientAttribution ??
      sanitizeClientAttribution(parseAttributionFromUnknown(prevMeta)) ??
      null;

    // Referral owner name is always server-resolved from promotion owner staff.
    if (attribution) {
      attribution.referralOwner = null;
      if (pricing.referralOwnerStaffId) {
        const staff = await prisma.user.findFirst({
          where: { id: pricing.referralOwnerStaffId },
          select: { firstName: true, lastName: true },
        });
        if (staff) {
          attribution.referralOwner =
            `${staff.firstName} ${staff.lastName}`.trim();
        }
      }
    }

    await prisma.registration.update({
      where: { id: registration.id },
      data: {
        leadId: leadResult.leadId,
        metadata: {
          ...prevMeta,
          ...appliedPromotionsMetadata(pricing.appliedPromotions ?? [], {
            referralPromotionId: pricing.referralPromotionId,
            referralOwnerStaffId: pricing.referralOwnerStaffId,
          }),
          // leadLink snapshot is always built server-side (never from client).
          ...(leadSnapshot
            ? leadLinkToMetadataPatch(leadSnapshot, attribution)
            : attribution
              ? attributionToMetadataPatch(attribution)
              : {}),
        } as Prisma.InputJsonValue,
      },
    });

    const timelineEvents: Array<{
      kind:
        | "started"
        | "promotion_applied"
        | "payment_started"
        | "completed";
      summary?: string;
      metadata?: Record<string, unknown>;
    }> = [
      {
        kind: "started",
        summary: `${registration.registrationNumber} · ${pricing.productTitle}`,
      },
    ];

    const applied = pricing.appliedPromotions ?? [];
    if (applied.length > 0) {
      timelineEvents.push({
        kind: "promotion_applied",
        summary: applied.map((a) => a.title).join("، "),
        metadata: {
          codes: applied.map((a) => a.code).filter(Boolean).join(","),
          discountRials: pricing.discountRials,
        },
      });
    }

    if (needsCheckout) {
      timelineEvents.push({
        kind: "payment_started",
        summary: `مبلغ نهایی ${pricing.finalAmountRials}`,
      });
    } else {
      timelineEvents.push({
        kind: "completed",
        summary: "ثبت‌نام بدون پرداخت / رایگان تکمیل شد",
      });
    }

    await recordRegistrationLeadTimeline({
      organizationId: organization.id,
      leadId: leadResult.leadId,
      registrationId: registration.id,
      registrationNumber: registration.registrationNumber,
      flowKey: catalog.flowKey,
      events: timelineEvents,
    });

    try {
      await advanceLeadStageForRegistration({
        organizationId: organization.id,
        leadId: leadResult.leadId,
        phase: needsCheckout
          ? "payment_pending"
          : "registered",
      });
    } catch (error) {
      console.error(
        "[registration] lead stage advance failed",
        error instanceof Error ? error.message : "unknown",
      );
    }
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

  if (input.linkedForm?.formId && input.linkedForm.formVersionId) {
    const loaded = await loadPublicFormById(input.linkedForm.formId, {
      ignoreAvailability: true,
    });
    if (loaded.ok) {
      const { customFields } = partitionRegistrationFormFields(loaded.data.fields);
      const persisted = await persistRegistrationFormAnswers({
        registrationId: registration.id,
        formId: input.linkedForm.formId,
        formVersionId: input.linkedForm.formVersionId,
        fields: customFields,
        answers: (input.formAnswers ?? {}) as Record<string, PreservedFieldValue>,
        mobileNormalized: mobile.normalized,
        email: emailNormalized,
      });
      if (!persisted.ok) {
        return {
          ok: false,
          error: persisted.error,
          fieldErrors: persisted.fieldErrors,
        };
      }
    }
  }

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
