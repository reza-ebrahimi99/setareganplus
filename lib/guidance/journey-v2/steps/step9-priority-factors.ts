export {
  GUIDANCE_PRIORITY_FACTORS as GUIDANCE_V2_PRIORITY_FACTORS,
} from "@/lib/guidance/journey/reference-data/priority-factors";

import {
  loadStep9Data,
} from "@/lib/guidance/journey/steps/step9-priority-weights";

export async function loadGuidanceV2Step9(params: {
  organizationId: string;
  planPublicId: string;
}) {
  return loadStep9Data(params);
}
