/**
 * Map persisted timeline events onto the 5-step ops pipeline for UI.
 */

import type { TimelineNodeView } from "@/components/admin/Timeline";
import {
  COMMERCE_OPS_STAGE_LABELS,
  COMMERCE_OPS_STAGES,
  commerceOpsStageIndex,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";

export type TimelineEventViewInput = {
  stage: CommerceOpsStageValue | null;
  title: string;
  note: string | null;
  occurredAtLabel: string;
  operatorName: string | null;
};

export function buildOpsTimelineNodes(params: {
  current: CommerceOpsStageValue;
  events: readonly TimelineEventViewInput[];
}): TimelineNodeView[] {
  const currentIndex = commerceOpsStageIndex(params.current);
  const latestByStage = new Map<CommerceOpsStageValue, TimelineEventViewInput>();
  for (const event of params.events) {
    if (!event.stage) continue;
    latestByStage.set(event.stage, event);
  }

  return COMMERCE_OPS_STAGES.map((stage, index) => {
    const event = latestByStage.get(stage);
    const status: TimelineNodeView["status"] =
      index < currentIndex
        ? "completed"
        : index === currentIndex
          ? "current"
          : "upcoming";
    const showEvent = status !== "upcoming";
    return {
      id: stage,
      label: COMMERCE_OPS_STAGE_LABELS[stage],
      status,
      timestampLabel: showEvent ? (event?.occurredAtLabel ?? null) : null,
      operator: showEvent ? (event?.operatorName ?? null) : null,
      note: showEvent ? (event?.note ?? null) : null,
    };
  });
}
