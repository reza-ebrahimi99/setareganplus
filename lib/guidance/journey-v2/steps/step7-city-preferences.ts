export {
  type ProvincePreferenceItem as GuidanceV2ProvincePreferenceItem,
} from "@/lib/guidance/journey/steps/step7-city-preferences";

import {
  loadStep7Data,
} from "@/lib/guidance/journey/steps/step7-city-preferences";

export async function loadGuidanceV2Step7(params: {
  organizationId: string;
  planPublicId: string;
  homeProvince?: string | null;
}) {
  return loadStep7Data({
    organizationId: params.organizationId,
    planPublicId: params.planPublicId,
    homeProvince: params.homeProvince ?? null,
  });
}
