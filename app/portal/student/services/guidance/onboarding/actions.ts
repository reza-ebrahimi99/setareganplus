"use server";

import { redirect } from "next/navigation";
import { readSessionRequestMetadata } from "@/lib/auth/session";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import {
  completeGuidanceCandidateOnboarding,
  saveGuidanceOnboardingDraft,
  type GuidanceOnboardingDraft,
} from "@/lib/guidance/onboarding";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export type GuidanceOnboardingFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  savedAtIso?: string;
};

export type GuidanceOnboardingDraftState = {
  ok?: boolean;
  error?: string;
  savedAtIso?: string;
};

function field(formData: FormData, key: string): string {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

function draftFromForm(formData: FormData): Partial<GuidanceOnboardingDraft> {
  return {
    fullName: field(formData, "fullName"),
    nationalId: field(formData, "nationalId"),
    birthDate: field(formData, "birthDate"),
    gender: field(formData, "gender"),
    province: field(formData, "province"),
    city: field(formData, "city"),
    graduationYear: field(formData, "graduationYear"),
    highSchoolMajor: field(formData, "highSchoolMajor"),
    schoolName: field(formData, "schoolName"),
    parentMobile: field(formData, "parentMobile"),
    quota: field(formData, "quota"),
  };
}

export async function saveGuidanceOnboardingDraftAction(
  formData: FormData,
): Promise<GuidanceOnboardingDraftState> {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) {
    return { error: "حساب دانش‌آموزی فعال نیست." };
  }
  const parsedMobile = normalizeIranianMobile(context.user.mobile ?? "");
  if (!parsedMobile.ok) {
    return { error: "شماره موبایل حساب یافت نشد." };
  }

  const result = await saveGuidanceOnboardingDraft({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
    normalizedMobile: parsedMobile.normalized,
    patch: draftFromForm(formData),
  });
  if (!result.ok) return { error: result.error };
  return { ok: true, savedAtIso: result.savedAtIso };
}

export async function submitGuidanceOnboardingAction(
  _state: GuidanceOnboardingFormState,
  formData: FormData,
): Promise<GuidanceOnboardingFormState> {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) {
    return { error: "حساب دانش‌آموزی فعال نیست." };
  }

  const parsedMobile = normalizeIranianMobile(context.user.mobile ?? "");
  if (!parsedMobile.ok) {
    return { error: "شماره موبایل حساب یافت نشد." };
  }

  const requestMetadata = await readSessionRequestMetadata();
  const result = await completeGuidanceCandidateOnboarding({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
    normalizedMobile: parsedMobile.normalized,
    input: {
      fullName: field(formData, "fullName"),
      nationalId: field(formData, "nationalId"),
      birthDate: field(formData, "birthDate"),
      gender: field(formData, "gender"),
      province: field(formData, "province"),
      city: field(formData, "city"),
      graduationYear: field(formData, "graduationYear"),
      highSchoolMajor: field(formData, "highSchoolMajor"),
      schoolName: field(formData, "schoolName"),
      mobile: field(formData, "mobile") || parsedMobile.normalized,
      parentMobile: field(formData, "parentMobile"),
    },
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
  });

  if (!result.ok) {
    return {
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  redirect("/ms");
}
