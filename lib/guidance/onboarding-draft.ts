/**
 * Client-safe onboarding draft shape and completeness gates.
 */

export type GuidanceOnboardingDraft = {
  fullName: string;
  nationalId: string;
  birthDate: string;
  gender: string;
  province: string;
  city: string;
  graduationYear: string;
  highSchoolMajor: string;
  schoolName: string;
  parentMobile: string;
  quota: string;
  savedAtIso: string;
  completedAtIso: string | null;
};

export const EMPTY_ONBOARDING_DRAFT: GuidanceOnboardingDraft = {
  fullName: "",
  nationalId: "",
  birthDate: "",
  gender: "",
  province: "",
  city: "",
  graduationYear: "",
  highSchoolMajor: "",
  schoolName: "",
  parentMobile: "",
  quota: "",
  savedAtIso: "",
  completedAtIso: null,
};

export function draftHasIdentity(draft: GuidanceOnboardingDraft): boolean {
  return Boolean(
    draft.fullName.trim() &&
      draft.nationalId.trim() &&
      draft.birthDate.trim() &&
      (draft.gender === "MALE" || draft.gender === "FEMALE") &&
      draft.province.trim() &&
      draft.city.trim(),
  );
}

export function draftHasAcademic(draft: GuidanceOnboardingDraft): boolean {
  return Boolean(
    draft.graduationYear.trim() &&
      draft.highSchoolMajor.trim() &&
      draft.schoolName.trim() &&
      draft.quota.trim(),
  );
}
