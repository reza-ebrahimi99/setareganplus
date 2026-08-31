/**
 * Guidance Journey Engine — Step 1: Personal Information (Phase 1).
 * Reuses Student/User for name, GuidancePlan columns for quota/average/consent,
 * the existing final-grades document pipeline for the transcript PDF, and the
 * generic step-store for the remaining identity fields (national id, gender,
 * birth date, province) that have no dedicated column yet.
 */

import { AuditAction } from "@/generated/prisma/enums";
import { toLatinDigits } from "@/lib/forms/latin-digits";
import { validateIranianNationalId } from "@/lib/forms/validate-national-id";
import { uploadGuidanceFinalGrades } from "@/lib/guidance/documents";
import { advanceGuidanceJourneyStep } from "@/lib/guidance/journey/advance";
import {
  loadGuidanceStepData,
  saveGuidanceStepData,
} from "@/lib/guidance/journey/step-store";
import { isGuidanceQuotaId } from "@/lib/guidance/journey/reference-data/quota";
import { IRAN_PROVINCES } from "@/lib/registration/iran-locations";
import { prisma } from "@/lib/prisma";
import { composeStudentFullName } from "@/lib/website/student-slug";

export const STEP1_CATEGORY = "guidance-journey-step1";
export const STEP1_KIND = "guidance-journey-step1";

export type Step1IdentityData = {
  nationalId: string;
  gender: "MALE" | "FEMALE";
  birthDate: string;
  province: string;
};

export type Step1Input = {
  fullName: string;
  nationalId: string;
  gender: string;
  birthDate: string;
  province: string;
  quota: string;
  highSchoolAverage: string;
  confirmed: boolean;
};

export type Step1ValidatedInput = {
  firstName: string;
  lastName: string;
  fullName: string;
  identity: Step1IdentityData;
  quota: string;
  highSchoolAverage: number;
};

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "داوطلب", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function parseBirthDate(raw: string): Date | null {
  const value = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  if (year < 1960 || year > new Date().getUTCFullYear() - 10) return null;
  return date;
}

function parseAverage(raw: string): number | null {
  const normalized = toLatinDigits(raw.trim()).replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  if (value < 0 || value > 20) return null;
  return Math.round(value * 100) / 100;
}

export function validateStep1Input(
  input: Step1Input,
): { ok: true; data: Step1ValidatedInput } | { ok: false; error: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};

  const fullName = input.fullName.trim().slice(0, 120);
  if (fullName.length < 3) {
    fieldErrors.fullName = "نام و نام خانوادگی الزامی است.";
  }

  const national = validateIranianNationalId(input.nationalId);
  if (!national.ok) {
    fieldErrors.nationalId = national.error;
  }

  const birthDate = parseBirthDate(input.birthDate);
  if (!birthDate) {
    fieldErrors.birthDate = "تاریخ تولد معتبر وارد کنید.";
  }

  const gender = input.gender === "MALE" || input.gender === "FEMALE" ? input.gender : null;
  if (!gender) {
    fieldErrors.gender = "جنسیت را انتخاب کنید.";
  }

  const province = input.province.trim();
  if (!(IRAN_PROVINCES as readonly string[]).includes(province)) {
    fieldErrors.province = "استان معتبر انتخاب کنید.";
  }

  const quota = input.quota.trim();
  if (!isGuidanceQuotaId(quota)) {
    fieldErrors.quota = "سهمیه را انتخاب کنید.";
  }

  const highSchoolAverage = parseAverage(input.highSchoolAverage);
  if (highSchoolAverage === null) {
    fieldErrors.highSchoolAverage = "معدل باید عددی بین ۰ تا ۲۰ باشد.";
  }

  if (!input.confirmed) {
    fieldErrors.confirmed = "برای ادامه باید صحت اطلاعات را تأیید کنید.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "لطفاً موارد مشخص‌شده را اصلاح کنید.",
      fieldErrors,
    };
  }

  const { firstName, lastName } = splitFullName(fullName);

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      fullName,
      identity: {
        nationalId: national.ok ? national.normalized : "",
        gender: gender!,
        birthDate: input.birthDate.trim(),
        province,
      },
      quota,
      highSchoolAverage: highSchoolAverage!,
    },
  };
}

export async function loadStep1Prefill(params: {
  organizationId: string;
  planPublicId: string;
}): Promise<Partial<Step1IdentityData>> {
  const stored = await loadGuidanceStepData<Step1IdentityData>({
    organizationId: params.organizationId,
    category: STEP1_CATEGORY,
    kind: STEP1_KIND,
    planPublicId: params.planPublicId,
    validate: (raw) => {
      if (!raw || typeof raw !== "object") return null;
      const obj = raw as Record<string, unknown>;
      if (
        typeof obj.nationalId !== "string" ||
        typeof obj.birthDate !== "string" ||
        typeof obj.province !== "string" ||
        (obj.gender !== "MALE" && obj.gender !== "FEMALE")
      ) {
        return null;
      }
      return {
        nationalId: obj.nationalId,
        gender: obj.gender,
        birthDate: obj.birthDate,
        province: obj.province,
      };
    },
  });
  return stored.data ?? {};
}

export type CompleteStep1Result =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function completeGuidanceStep1(params: {
  organizationId: string;
  actorUserId: string;
  studentId: string;
  planId: string;
  planPublicId: string;
  input: Step1Input;
  file: File | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<CompleteStep1Result> {
  const validated = validateStep1Input(params.input);
  if (!validated.ok) {
    return { ok: false, error: validated.error, fieldErrors: validated.fieldErrors };
  }

  // Transcript upload: required unless one was already uploaded in a prior visit.
  const existingDoc = await prisma.guidanceDocument.findFirst({
    where: {
      organizationId: params.organizationId,
      planId: params.planId,
      documentType: "FINAL_GRADES",
      isLatest: true,
      deletedAt: null,
    },
    select: { id: true },
  });

  // Transcript PDF is collected after per-subject grades in the office flow.

  if (params.file) {
    const uploaded = await uploadGuidanceFinalGrades({
      organizationId: params.organizationId,
      planId: params.planId,
      userId: params.actorUserId,
      file: params.file,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
    if (!uploaded.ok) {
      return { ok: false, error: uploaded.error, fieldErrors: { file: uploaded.error } };
    }
  }

  const student = await prisma.student.findFirst({
    where: { id: params.studentId, organizationId: params.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!student) {
    return { ok: false, error: "پرونده دانش‌آموز یافت نشد." };
  }

  const composedFullName = composeStudentFullName(
    validated.data.firstName,
    validated.data.lastName || validated.data.firstName,
  );

  await prisma.$transaction([
    prisma.student.update({
      where: { id: student.id },
      data: {
        firstName: validated.data.firstName.slice(0, 80),
        lastName: (validated.data.lastName || validated.data.firstName).slice(0, 80),
        fullName: composedFullName.slice(0, 160),
      },
    }),
    prisma.user.update({
      where: { id: params.actorUserId },
      data: {
        firstName: validated.data.firstName.slice(0, 80),
        lastName: (validated.data.lastName || validated.data.firstName).slice(0, 80),
      },
    }),
    prisma.guidancePlan.update({
      where: { id: params.planId },
      data: {
        quota: validated.data.quota as never,
        highSchoolAverage: validated.data.highSchoolAverage,
        personalInfoConfirmedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        action: AuditAction.GUIDANCE_STATUS_CHANGED,
        entityType: "GuidancePlan",
        entityId: params.planId,
        metadata: {
          publicId: params.planPublicId,
          step: 1,
          quota: validated.data.quota,
          nationalIdSuffix: validated.data.identity.nationalId.slice(-4),
        },
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    }),
  ]);

  await saveGuidanceStepData<Step1IdentityData>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: STEP1_CATEGORY,
    kind: STEP1_KIND,
    planId: params.planId,
    planPublicId: params.planPublicId,
    data: validated.data.identity,
    filenamePrefix: "guidance-step1",
  });

  const advanced = await advanceGuidanceJourneyStep({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    studentId: params.studentId,
    stepId: 1,
  });

  if (!advanced.ok) {
    return { ok: false, error: advanced.error };
  }

  return { ok: true };
}
