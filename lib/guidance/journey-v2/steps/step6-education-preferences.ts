export {
  type EducationPreferenceItem as GuidanceV2EducationPreferenceItem,
} from "@/lib/guidance/journey/steps/step6-education-preferences";

import {
  loadStep6Data,
} from "@/lib/guidance/journey/steps/step6-education-preferences";

export async function loadGuidanceV2Step6(params: {
  organizationId: string;
  planPublicId: string;
}) {
  return loadStep6Data(params);
}
