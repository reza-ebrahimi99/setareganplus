import { ExperienceBlockStatus } from "@/generated/prisma/enums";
import type { BlockMediaRole } from "@/lib/experience/media-types";
import {
  getBlockDefinition,
  isExperienceBlockType,
} from "@/lib/experience/registry";
import { REGISTRATION_FORM_BLOCK_TYPE } from "@/lib/experience/blocks/registration-form";
import {
  issue,
  type ExperienceIssue,
} from "@/lib/experience/service/types";

export type PublishBlockInput = {
  id: string;
  type: string;
  status: string;
  sortOrder: number;
  config: unknown;
  mediaLinks: Array<{ role: string; mediaId: string; sortOrder: number }>;
};

export type PublishValidationContext = {
  versionId: string;
  experienceId: string;
  organizationId: string;
  purpose: string;
  ownerExists: boolean;
  blocks: PublishBlockInput[];
};

export type PublishValidationResult =
  | { ok: true }
  | { ok: false; issues: ExperienceIssue[] };

export function isEnabledBlockStatus(status: string): boolean {
  return status !== ExperienceBlockStatus.DISABLED;
}

/**
 * Pure publish gate for an ExperienceVersion draft (no DB).
 * Structured issues for admin UI — not concatenated strings only.
 */
export function validateExperienceVersionForPublish(
  input: PublishValidationContext,
): PublishValidationResult {
  const issues: ExperienceIssue[] = [];

  if (!input.ownerExists) {
    issues.push(
      issue("OWNER_NOT_FOUND", "مالک تجربه در این سازمان یافت نشد."),
    );
  }

  const liveBlocks = input.blocks
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));

  const enabled = liveBlocks.filter((block) => isEnabledBlockStatus(block.status));

  if (enabled.length === 0) {
    issues.push(
      issue(
        "VALIDATION_FAILED",
        "برای انتشار حداقل یک بلوک فعال الزامی است.",
        { path: "blocks" },
      ),
    );
  }

  // Deterministic contiguous order among live (non-deleted) blocks
  for (let i = 0; i < liveBlocks.length; i += 1) {
    if (liveBlocks[i].sortOrder !== i) {
      issues.push(
        issue(
          "VALIDATION_FAILED",
          "ترتیب بلوک‌ها نامعتبر است؛ قبل از انتشار نرمال‌سازی لازم است.",
          {
            path: "blocks.sortOrder",
            blockId: liveBlocks[i].id,
            details: { expected: i, actual: liveBlocks[i].sortOrder },
          },
        ),
      );
      break;
    }
  }

  let registrationFormCount = 0;

  for (const block of enabled) {
    if (!isExperienceBlockType(block.type)) {
      issues.push(
        issue("BLOCK_TYPE_UNKNOWN", `نوع بلوک ناشناخته: ${block.type}`, {
          blockId: block.id,
          blockType: block.type,
          path: `blocks.${block.id}.type`,
        }),
      );
      continue;
    }

    const definition = getBlockDefinition(block.type);
    const parsed = definition.parseConfig(block.config);
    if (!parsed.ok) {
      issues.push(
        issue("BLOCK_CONFIG_INVALID", parsed.error, {
          blockId: block.id,
          blockType: block.type,
          path: `blocks.${block.id}.config`,
        }),
      );
    }

    const allowedRoles = new Set(definition.mediaRoles);
    const seenRoles = new Set<string>();
    for (const link of block.mediaLinks) {
      if (!allowedRoles.has(link.role as BlockMediaRole)) {
        issues.push(
          issue(
            "MEDIA_INVALID",
            `نقش رسانه «${link.role}» برای بلوک ${block.type} مجاز نیست.`,
            {
              blockId: block.id,
              blockType: block.type,
              path: `blocks.${block.id}.media.${link.role}`,
            },
          ),
        );
      }
      const roleKey = `${link.role}:${link.sortOrder}`;
      if (seenRoles.has(roleKey)) {
        issues.push(
          issue(
            "MEDIA_INVALID",
            `پیوند رسانه تکراری برای نقش ${link.role}.`,
            {
              blockId: block.id,
              blockType: block.type,
              path: `blocks.${block.id}.media`,
            },
          ),
        );
      }
      seenRoles.add(roleKey);
    }

    if (block.type === REGISTRATION_FORM_BLOCK_TYPE) {
      registrationFormCount += 1;
    }
  }

  if (input.purpose === "LANDING") {
    if (registrationFormCount !== 1) {
      issues.push(
        issue(
          "VALIDATION_FAILED",
          "تجربه LANDING باید دقیقاً یک بلوک فعال REGISTRATION_FORM داشته باشد.",
          {
            path: "blocks.REGISTRATION_FORM",
            details: { count: registrationFormCount },
          },
        ),
      );
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true };
}
