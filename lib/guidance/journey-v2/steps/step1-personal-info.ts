import { loadGuidanceStepData } from "@/lib/guidance/journey/step-store";

export type GuidanceV2Step1Data = {
  firstName: string;
  lastName: string;
  nationalId: string;
  gender: string;
  birthDateJalali: string;
  nativeProvince: string;
  regionQuota: string;
  specialQuota: string;
  highSchoolAverage: number | null;
  alternateMobile: string;
};

function validate(raw: unknown): GuidanceV2Step1Data | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as GuidanceV2Step1Data;
}

export function loadGuidanceV2Step1(params: {
  organizationId: string;
  planPublicId: string;
}) {
  return loadGuidanceStepData<GuidanceV2Step1Data>({
    organizationId: params.organizationId,
    category: "guidance-journey-v2-step1",
    kind: "guidance-journey-v2-step1",
    planPublicId: params.planPublicId,
    validate,
  });
}
