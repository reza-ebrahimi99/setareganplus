export {
  type MajorPreferenceItem as GuidanceV2MajorPreferenceItem,
} from "@/lib/guidance/journey/steps/step8-major-preferences";

import {
  loadStep8Data,
} from "@/lib/guidance/journey/steps/step8-major-preferences";

import type { GuidanceExamGroup } from "@/lib/guidance/types";

export async function loadGuidanceV2Step8(params: {
  organizationId: string;
  planPublicId: string;
  examGroups: readonly GuidanceExamGroup[];
}) {
  const primary = params.examGroups[0];

  if (!primary) {
    return { items: [] };
  }

  return loadStep8Data({
    organizationId: params.organizationId,
    planPublicId: params.planPublicId,
    examGroup: primary,
  });
}
