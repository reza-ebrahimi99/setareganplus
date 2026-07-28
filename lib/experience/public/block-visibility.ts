/**
 * Single testable gate for whether a loaded Experience block may render publicly.
 * Uses server `now` only — never the browser clock.
 *
 * Schedule fields on the model are `opensAt` / `closesAt` (inclusive boundaries).
 */

import { ExperienceBlockStatus } from "@/generated/prisma/enums";
import type { LoadedExperienceBlock } from "@/lib/experience/service/loaders";

export type BlockVisibilityReason =
  | "VISIBLE"
  | "DISABLED"
  | "DRAFT_STATUS"
  | "INVALID_CONFIG"
  | "UNKNOWN_TYPE"
  | "NOT_YET_ACTIVE"
  | "EXPIRED"
  | "INVALID_SCHEDULE";

export type BlockVisibilityResult = {
  visible: boolean;
  reason: BlockVisibilityReason;
};

export type BlockVisibilityInput = Pick<
  LoadedExperienceBlock,
  "status" | "opensAt" | "closesAt" | "config" | "diagnostics" | "type"
>;

/**
 * Inclusive window: visible when opensAt <= now <= closesAt (nulls are open-ended).
 * Invalid when both set and opensAt > closesAt.
 */
export function isBlockPubliclyVisible(
  block: BlockVisibilityInput,
  now: Date,
): BlockVisibilityResult {
  if (block.status === ExperienceBlockStatus.DISABLED) {
    return { visible: false, reason: "DISABLED" };
  }

  if (block.status === ExperienceBlockStatus.DRAFT) {
    return { visible: false, reason: "DRAFT_STATUS" };
  }

  if (block.diagnostics.some((d) => d.code === "BLOCK_TYPE_UNKNOWN")) {
    return { visible: false, reason: "UNKNOWN_TYPE" };
  }

  if (block.config == null) {
    return { visible: false, reason: "INVALID_CONFIG" };
  }

  if (
    block.diagnostics.some(
      (d) =>
        d.code === "BLOCK_CONFIG_INVALID" || d.code === "BLOCK_TYPE_UNKNOWN",
    )
  ) {
    return { visible: false, reason: "INVALID_CONFIG" };
  }

  const opensAtMs = block.opensAt?.getTime() ?? null;
  const closesAtMs = block.closesAt?.getTime() ?? null;
  const nowMs = now.getTime();

  if (
    opensAtMs != null &&
    Number.isNaN(opensAtMs)
  ) {
    return { visible: false, reason: "INVALID_SCHEDULE" };
  }
  if (
    closesAtMs != null &&
    Number.isNaN(closesAtMs)
  ) {
    return { visible: false, reason: "INVALID_SCHEDULE" };
  }

  if (opensAtMs != null && closesAtMs != null && opensAtMs > closesAtMs) {
    return { visible: false, reason: "INVALID_SCHEDULE" };
  }

  if (opensAtMs != null && nowMs < opensAtMs) {
    return { visible: false, reason: "NOT_YET_ACTIVE" };
  }

  if (closesAtMs != null && nowMs > closesAtMs) {
    return { visible: false, reason: "EXPIRED" };
  }

  return { visible: true, reason: "VISIBLE" };
}

export function sortBlocksDeterministically<
  T extends { sortOrder: number; id: string },
>(blocks: readonly T[]): T[] {
  return [...blocks].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id.localeCompare(b.id);
  });
}
