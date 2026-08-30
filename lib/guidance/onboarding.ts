/**
 * Guidance Platform — external candidate onboarding after portal OTP.
 * Persists identity fields on Student/User where possible + private MediaAsset JSON.
 * Ensures GuidancePlan exists and records consent (marks PreRegistration complete).
 */

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import {
  AuditAction,
  Gender,
  GuidanceExamGroup,
  GuidancePlanStatus,
  MediaAssetStatus,
} from "@/generated/prisma/enums";
import {
  GUIDANCE_PRE_REG_CONSENT_TEXT,
  GUIDANCE_PRE_REG_CONSENT_VERSION,
} from "@/lib/guidance/consent";
import { provisionExternalGuidanceCandidate } from "@/lib/guidance/external-candidate";
import {
  HIGH_SCHOOL_MAJOR_OPTIONS,
  ONBOARDING_PROVISIONAL_EXAM_GROUP,
  type HighSchoolMajorId,
} from "@/lib/guidance/onboarding-options";
import { toLatinDigits } from "@/lib/forms/latin-digits";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { validateIranianNationalId } from "@/lib/forms/validate-national-id";
import {
  absolutePathForStorageKey,
  generatePrivateGuidanceUploadStorageKey,
  writeMediaFile,
} from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";
import { IRAN_PROVINCES } from "@/lib/registration/iran-locations";
import {
  composeStudentFullName,
  slugFromStudentName,
} from "@/lib/website/student-slug";
import { ensureDefaultStudentMajors } from "@/lib/website/student-majors";

export {
  HIGH_SCHOOL_MAJOR_OPTIONS,
  type HighSchoolMajorId,
} from "@/lib/guidance/onboarding-options";

export const ONBOARDING_SESSION_CATEGORY =
  "guidance-candidate-onboarding" as const;
export const ONBOARDING_SESSION_KIND =
  "guidance-candidate-onboarding" as const;

export type GuidanceOnboardingInput = {
  fullName: string;
  nationalId: string;
  birthDate: string;
  gender: string;
  province: string;
  city: string;
  graduationYear: string;
  highSchoolMajor: string;
  schoolName: string;
  mobile: string;
  parentMobile?: string;
};

export type GuidanceOnboardingProfile = {
  fullName: string;
  nationalId: string;
  birthDate: string;
  gender: "MALE" | "FEMALE";
  province: string;
  city: string;
  graduationYear: string;
  highSchoolMajor: HighSchoolMajorId;
  highSchoolMajorLabel: string;
  schoolName: string;
  mobile: string;
  parentMobile: string | null;
  completedAtIso: string;
};

type StoredPayload = {
  kind: typeof ONBOARDING_SESSION_KIND;
  planId: string;
  planPublicId: string;
  profile: GuidanceOnboardingProfile;
};

export type CompleteGuidanceOnboardingResult =
  | {
      ok: true;
      planPublicId: string;
      createdPlan: boolean;
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "داوطلب", lastName: "جدید" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: parts[0]! };
  }
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  };
}

function parseGender(raw: string): Gender | null {
  if (raw === Gender.MALE || raw === "MALE") return Gender.MALE;
  if (raw === Gender.FEMALE || raw === "FEMALE") return Gender.FEMALE;
  return null;
}

function parseMajor(raw: string): (typeof HIGH_SCHOOL_MAJOR_OPTIONS)[number] | null {
  return (
    HIGH_SCHOOL_MAJOR_OPTIONS.find((row) => row.id === raw.trim()) ?? null
  );
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

function parseGraduationYear(raw: string): string | null {
  const digits = toLatinDigits(raw.trim()).replace(/[^\d]/g, "");
  if (!/^\d{4}$/.test(digits)) return null;
  const year = Number(digits);
  if (year < 1390 || year > 1410) return null;
  return digits;
}

export function validateGuidanceOnboardingInput(
  input: GuidanceOnboardingInput,
): { ok: true; profile: Omit<GuidanceOnboardingProfile, "completedAtIso"> } | {
  ok: false;
  error: string;
  fieldErrors: Record<string, string>;
} {
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

  const gender = parseGender(input.gender);
  if (!gender || gender === Gender.UNSPECIFIED) {
    fieldErrors.gender = "جنسیت را انتخاب کنید.";
  }

  const province = input.province.trim();
  if (!(IRAN_PROVINCES as readonly string[]).includes(province)) {
    fieldErrors.province = "استان معتبر انتخاب کنید.";
  }

  const city = input.city.trim().slice(0, 80);
  if (!city) {
    fieldErrors.city = "شهر الزامی است.";
  }

  const graduationYear = parseGraduationYear(input.graduationYear);
  if (!graduationYear) {
    fieldErrors.graduationYear = "سال فارغ‌التحصیلی معتبر وارد کنید.";
  }

  const major = parseMajor(input.highSchoolMajor);
  if (!major) {
    fieldErrors.highSchoolMajor = "رشته دبیرستان را انتخاب کنید.";
  }

  const schoolName = input.schoolName.trim().slice(0, 120);
  if (!schoolName) {
    fieldErrors.schoolName = "نام مدرسه الزامی است.";
  }

  const mobileParsed = normalizeIranianMobile(input.mobile);
  if (!mobileParsed.ok) {
    fieldErrors.mobile = "شماره موبایل معتبر وارد کنید.";
  }

  let parentMobile: string | null = null;
  const parentRaw = input.parentMobile?.trim() ?? "";
  if (parentRaw) {
    const parentParsed = normalizeIranianMobile(parentRaw);
    if (!parentParsed.ok) {
      fieldErrors.parentMobile = "شماره موبایل والد معتبر نیست.";
    } else {
      parentMobile = parentParsed.normalized;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "لطفاً موارد مشخص‌شده را اصلاح کنید.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    profile: {
      fullName,
      nationalId: national.ok ? national.normalized : "",
      birthDate: input.birthDate.trim(),
      gender: gender === Gender.FEMALE ? "FEMALE" : "MALE",
      province,
      city,
      graduationYear: graduationYear!,
      highSchoolMajor: major!.id,
      highSchoolMajorLabel: major!.label,
      schoolName,
      mobile: mobileParsed.ok ? mobileParsed.normalized : "",
      parentMobile,
    },
  };
}

async function readJsonFile(storageKey: string): Promise<unknown | null> {
  try {
    const absolute = absolutePathForStorageKey(storageKey);
    const buf = await fs.readFile(absolute);
    return JSON.parse(buf.toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

export async function loadGuidanceOnboardingProfile(params: {
  organizationId: string;
  userId: string;
  planPublicId: string;
}): Promise<GuidanceOnboardingProfile | null> {
  const asset = await prisma.mediaAsset.findFirst({
    where: {
      organizationId: params.organizationId,
      createdByUserId: params.userId,
      category: ONBOARDING_SESSION_CATEGORY,
      deletedAt: null,
      status: MediaAssetStatus.ACTIVE,
    },
    orderBy: { updatedAt: "desc" },
    select: { storageKey: true, metadata: true },
  });
  if (!asset) return null;

  const fileJson = await readJsonFile(asset.storageKey);
  const raw =
    fileJson && typeof fileJson === "object"
      ? (fileJson as Record<string, unknown>)
      : (asset.metadata as Record<string, unknown> | null);
  if (!raw || raw.kind !== ONBOARDING_SESSION_KIND) return null;
  if (raw.planPublicId !== params.planPublicId) return null;
  const profile = raw.profile;
  if (!profile || typeof profile !== "object") return null;
  return profile as GuidanceOnboardingProfile;
}

async function persistOnboardingProfile(params: {
  organizationId: string;
  userId: string;
  planId: string;
  planPublicId: string;
  profile: GuidanceOnboardingProfile;
}): Promise<void> {
  const payload: StoredPayload = {
    kind: ONBOARDING_SESSION_KIND,
    planId: params.planId,
    planPublicId: params.planPublicId,
    profile: params.profile,
  };
  const body = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
  const checksum = createHash("sha256").update(body).digest("hex");

  const existing = await prisma.mediaAsset.findFirst({
    where: {
      organizationId: params.organizationId,
      createdByUserId: params.userId,
      category: ONBOARDING_SESSION_CATEGORY,
      deletedAt: null,
      status: MediaAssetStatus.ACTIVE,
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, storageKey: true },
  });

  if (existing) {
    await writeMediaFile({ storageKey: existing.storageKey, data: body });
    await prisma.mediaAsset.update({
      where: { id: existing.id },
      data: {
        byteSize: body.byteLength,
        checksum,
        mimeType: "application/json",
        originalName: `guidance-onboarding-${params.planPublicId}.json`,
        metadata: payload as object,
        updatedAt: new Date(),
      },
    });
    return;
  }

  const storageKey = generatePrivateGuidanceUploadStorageKey("json");
  await writeMediaFile({ storageKey, data: body });
  await prisma.mediaAsset.create({
    data: {
      organizationId: params.organizationId,
      storageKey,
      originalName: `guidance-onboarding-${params.planPublicId}.json`,
      mimeType: "application/json",
      byteSize: body.byteLength,
      checksum,
      status: MediaAssetStatus.ACTIVE,
      category: ONBOARDING_SESSION_CATEGORY,
      createdByUserId: params.userId,
      metadata: payload as object,
    },
  });
}

/**
 * Completes external-candidate onboarding: identity + consent + ensure case.
 */
export async function completeGuidanceCandidateOnboarding(params: {
  organizationId: string;
  userId: string;
  studentId: string;
  normalizedMobile: string;
  input: GuidanceOnboardingInput;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<CompleteGuidanceOnboardingResult> {
  const validated = validateGuidanceOnboardingInput(params.input);
  if (!validated.ok) {
    return {
      ok: false,
      error: validated.error,
      fieldErrors: validated.fieldErrors,
    };
  }

  if (validated.profile.mobile !== params.normalizedMobile) {
    return {
      ok: false,
      error: "شماره موبایل باید با شماره ورود یکسان باشد.",
      fieldErrors: { mobile: "شماره موبایل با حساب شما مطابقت ندارد." },
    };
  }

  await ensureDefaultStudentMajors(params.organizationId);
  const majorRow = await prisma.studentMajor.findFirst({
    where: {
      organizationId: params.organizationId,
      slug: validated.profile.highSchoolMajor,
      deletedAt: null,
      isActive: true,
    },
    select: { id: true },
  });

  const { firstName, lastName } = splitFullName(validated.profile.fullName);
  const fullName = composeStudentFullName(firstName, lastName);
  const examGroupCode =
    HIGH_SCHOOL_MAJOR_OPTIONS.find(
      (row) => row.id === validated.profile.highSchoolMajor,
    )?.examGroup ?? ONBOARDING_PROVISIONAL_EXAM_GROUP;
  const examGroup = examGroupCode as GuidanceExamGroup;

  let plan = await prisma.guidancePlan.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      studentId: params.studentId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, publicId: true, consentGrantedAt: true },
  });

  let createdPlan = false;
  if (!plan) {
    const provisioned = await provisionExternalGuidanceCandidate({
      organizationId: params.organizationId,
      normalizedMobile: params.normalizedMobile,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
    if (!provisioned.ok) {
      return { ok: false, error: provisioned.error };
    }
    const ensured = await prisma.guidancePlan.findFirst({
      where: {
        organizationId: params.organizationId,
        publicId: provisioned.planPublicId,
        deletedAt: null,
      },
      select: { id: true, publicId: true, consentGrantedAt: true },
    });
    if (!ensured) {
      return { ok: false, error: "پرونده هدایت ایجاد نشد. دوباره تلاش کنید." };
    }
    plan = ensured;
    createdPlan = provisioned.createdPlan;
  }

  const now = new Date();
  const profile: GuidanceOnboardingProfile = {
    ...validated.profile,
    completedAtIso: now.toISOString(),
  };

  const student = await prisma.student.findFirst({
    where: {
      id: params.studentId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true, slug: true },
  });
  if (!student) {
    return { ok: false, error: "پرونده دانش‌آموز یافت نشد." };
  }

  const desiredSlug = slugFromStudentName(fullName);
  let nextSlug = student.slug;
  if (desiredSlug && desiredSlug !== student.slug) {
    const clash = await prisma.student.findFirst({
      where: {
        organizationId: params.organizationId,
        slug: desiredSlug,
        deletedAt: null,
        NOT: { id: student.id },
      },
      select: { id: true },
    });
    if (!clash) nextSlug = desiredSlug.slice(0, 80);
  }

  await prisma.$transaction([
    prisma.student.update({
      where: { id: student.id },
      data: {
        firstName: firstName.slice(0, 80),
        lastName: lastName.slice(0, 80),
        fullName: fullName.slice(0, 160),
        slug: nextSlug,
        schoolYear: profile.graduationYear,
        majorId: majorRow?.id ?? null,
        parentName: profile.parentMobile,
      },
    }),
    prisma.user.update({
      where: { id: params.userId },
      data: {
        firstName: firstName.slice(0, 80),
        lastName: lastName.slice(0, 80),
      },
    }),
    prisma.guidancePlan.update({
      where: { id: plan.id },
      data: {
        status: GuidancePlanStatus.PRE_REGISTERED,
        examGroup,
        consentGrantedAt: now,
        consentVersion: GUIDANCE_PRE_REG_CONSENT_VERSION,
        consentText: GUIDANCE_PRE_REG_CONSENT_TEXT,
      },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorUserId: params.userId,
        action: AuditAction.GUIDANCE_STATUS_CHANGED,
        entityType: "GuidancePlan",
        entityId: plan.id,
        metadata: {
          publicId: plan.publicId,
          flow: "external-candidate-onboarding",
          status: GuidancePlanStatus.PRE_REGISTERED,
          examGroup,
          nationalIdSuffix: profile.nationalId.slice(-4),
          province: profile.province,
          city: profile.city,
          graduationYear: profile.graduationYear,
          highSchoolMajor: profile.highSchoolMajor,
          onboardingCompleted: true,
        },
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    }),
  ]);

  await persistOnboardingProfile({
    organizationId: params.organizationId,
    userId: params.userId,
    planId: plan.id,
    planPublicId: plan.publicId,
    profile,
  });

  return {
    ok: true,
    planPublicId: plan.publicId,
    createdPlan,
  };
}
