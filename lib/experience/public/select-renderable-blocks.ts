/**
 * Pure helpers for selecting publicly renderable Experience blocks.
 * Used by ExperienceRenderer and unit tests.
 */

import { REGISTRATION_FORM_BLOCK_TYPE } from "@/lib/experience/blocks/registration-form";
import {
  isBlockPubliclyVisible,
  sortBlocksDeterministically,
  type BlockVisibilityReason,
} from "@/lib/experience/public/block-visibility";
import { isExperienceBlockType } from "@/lib/experience/registry";
import type {
  LoadedExperienceBlock,
  LoadedExperienceBundle,
} from "@/lib/experience/service/loaders";

export type SelectRenderableBlocksResult = {
  blocks: LoadedExperienceBlock[];
  skipped: Array<{
    blockId: string;
    blockType: string;
    reason: BlockVisibilityReason;
  }>;
  registrationFormCount: number;
};

export function selectRenderablePublicBlocks(
  blocks: readonly LoadedExperienceBlock[],
  now: Date,
): SelectRenderableBlocksResult {
  const ordered = sortBlocksDeterministically(blocks);
  const visible: LoadedExperienceBlock[] = [];
  const skipped: SelectRenderableBlocksResult["skipped"] = [];

  for (const block of ordered) {
    const gate = isBlockPubliclyVisible(block, now);
    if (!gate.visible) {
      skipped.push({
        blockId: block.id,
        blockType: block.type,
        reason: gate.reason,
      });
      continue;
    }
    if (!isExperienceBlockType(block.type) || block.config == null) {
      skipped.push({
        blockId: block.id,
        blockType: block.type,
        reason: "UNKNOWN_TYPE",
      });
      continue;
    }
    visible.push(block);
  }

  const registrationFormCount = visible.filter(
    (b) => b.type === REGISTRATION_FORM_BLOCK_TYPE,
  ).length;

  return { blocks: visible, skipped, registrationFormCount };
}

/** True when a published bundle has at least one publicly renderable block. */
export function experienceHasRenderableBlocks(
  bundle: LoadedExperienceBundle,
  now: Date,
): boolean {
  if (!bundle.version) return false;
  return selectRenderablePublicBlocks(bundle.version.blocks, now).blocks.length > 0;
}
