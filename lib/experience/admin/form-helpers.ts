/**
 * Pure helpers for Experience admin forms — unit-testable without DB.
 */

import { ExperienceBlockStatus } from "@/generated/prisma/enums";
import { REGISTRATION_FORM_BLOCK_TYPE } from "@/lib/experience/blocks/registration-form";
import {
  isExperienceBlockType,
  type ExperienceBlockType,
} from "@/lib/experience/registry";
import { isEnabledBlockStatus } from "@/lib/experience/service/validate-publish";

export type ExperienceEntryState = "NONE" | "PUBLISHED_ONLY" | "DRAFT_ACTIVE";

export function resolveExperienceEntryState(input: {
  hasExperience: boolean;
  hasDraft: boolean;
  hasPublished: boolean;
}): ExperienceEntryState {
  if (!input.hasExperience) return "NONE";
  if (input.hasDraft) return "DRAFT_ACTIVE";
  if (input.hasPublished) return "PUBLISHED_ONLY";
  return "NONE";
}

export function validateBlockScheduleWindow(
  opensAt: Date | null,
  closesAt: Date | null,
): { ok: true } | { ok: false; error: string } {
  if (opensAt && closesAt && opensAt.getTime() > closesAt.getTime()) {
    return {
      ok: false,
      error: "زمان شروع نمایش باید قبل یا برابر زمان پایان باشد.",
    };
  }
  return { ok: true };
}

export function canAddRegistrationFormBlock(
  blocks: Array<{ type: string; status: string }>,
): boolean {
  return !blocks.some(
    (block) =>
      block.type === REGISTRATION_FORM_BLOCK_TYPE &&
      isEnabledBlockStatus(block.status),
  );
}

export function canEnableRegistrationFormBlock(
  blocks: Array<{ id: string; type: string; status: string }>,
  blockId: string,
): boolean {
  return !blocks.some(
    (block) =>
      block.id !== blockId &&
      block.type === REGISTRATION_FORM_BLOCK_TYPE &&
      isEnabledBlockStatus(block.status),
  );
}

export function moveBlockInOrder(
  orderedIds: string[],
  blockId: string,
  direction: "up" | "down",
): string[] | null {
  const index = orderedIds.indexOf(blockId);
  if (index < 0) return null;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= orderedIds.length) return null;
  const next = [...orderedIds];
  const current = next[index]!;
  next[index] = next[swapWith]!;
  next[swapWith] = current;
  return next;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readCheckbox(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "true" || value === "on" || value === "1";
}

function buttonFromForm(formData: FormData, prefix: string) {
  const label = readString(formData, `${prefix}Label`).trim();
  const href = readString(formData, `${prefix}Href`).trim();
  if (!label && !href) return undefined;
  return { label, href };
}

/** Build typed-ish config object from FormData for registry parseConfig. */
export function buildExperienceBlockConfigFromForm(
  type: ExperienceBlockType,
  formData: FormData,
): unknown {
  switch (type) {
    case "HERO":
      return {
        v: 1,
        eyebrow: readString(formData, "eyebrow"),
        headline: readString(formData, "headline"),
        subheadline: readString(formData, "subheadline"),
        primaryCta: buttonFromForm(formData, "primaryCta"),
        secondaryCta: buttonFromForm(formData, "secondaryCta"),
        align: readString(formData, "align") || "start",
        overlay: readString(formData, "overlay") || "soft",
      };
    case "IMAGE":
      return {
        v: 1,
        caption: readString(formData, "caption"),
        altOverride: readString(formData, "altOverride"),
        aspect: readString(formData, "aspect") || "16/9",
        objectFit: readString(formData, "objectFit") || "cover",
        linkHref: readString(formData, "linkHref"),
      };
    case "RICH_TEXT":
      return {
        v: 1,
        title: readString(formData, "title"),
        body: readString(formData, "body"),
        textAlign: readString(formData, "textAlign") || "start",
        maxWidth: readString(formData, "maxWidth") || "prose",
      };
    case "FEATURES": {
      const itemCount = Number.parseInt(
        readString(formData, "itemCount").trim() || "0",
        10,
      );
      const safeCount = Number.isFinite(itemCount)
        ? Math.max(0, Math.min(12, itemCount))
        : 0;
      const items = Array.from({ length: safeCount }, (_, index) => ({
        title: readString(formData, `itemTitle_${index}`),
        description: readString(formData, `itemDescription_${index}`),
        iconKey: readString(formData, `itemIconKey_${index}`),
      }));
      return {
        v: 1,
        title: readString(formData, "title"),
        items,
      };
    }
    case "PRICING":
      return {
        v: 1,
        sectionTitle: readString(formData, "sectionTitle"),
        variant: readString(formData, "variant") || "card",
        showPaymentModeLabel: readCheckbox(formData, "showPaymentModeLabel"),
      };
    case "COUNTDOWN":
      return {
        v: 1,
        heading: readString(formData, "heading"),
        targetKind: readString(formData, "targetKind") || "AUTO",
        showWhenInactive: readCheckbox(formData, "showWhenInactive"),
      };
    case "CAPACITY":
      return {
        v: 1,
        heading: readString(formData, "heading"),
        showRemaining: readCheckbox(formData, "showRemaining"),
        fullMessage: readString(formData, "fullMessage"),
      };
    case "REGISTRATION_FORM":
      return {
        v: 1,
        introHeading: readString(formData, "introHeading"),
        introBody: readString(formData, "introBody"),
        showStartButton: readCheckbox(formData, "showStartButton"),
        startButtonLabel: readString(formData, "startButtonLabel"),
      };
    case "CTA":
      return {
        v: 1,
        title: readString(formData, "title"),
        description: readString(formData, "description"),
        primaryCta: buttonFromForm(formData, "primaryCta"),
        secondaryCta: buttonFromForm(formData, "secondaryCta"),
        align: readString(formData, "align") || "center",
      };
    case "SPACER":
      return {
        v: 1,
        size: readString(formData, "size") || "md",
      };
    default:
      return { v: 1 };
  }
}

export function parseBlockTypeOrNull(value: string): ExperienceBlockType | null {
  return isExperienceBlockType(value) ? value : null;
}

export function normalizeEnabledBlockStatus(
  raw: string,
): ExperienceBlockStatus | undefined {
  if (raw === ExperienceBlockStatus.DISABLED) {
    return ExperienceBlockStatus.DISABLED;
  }
  if (
    raw === ExperienceBlockStatus.PUBLISHED ||
    raw === ExperienceBlockStatus.DRAFT ||
    raw === "ENABLED"
  ) {
    return ExperienceBlockStatus.PUBLISHED;
  }
  return undefined;
}

/** Permission matrix for Experience admin surfaces (documentation + tests). */
export const EXPERIENCE_ADMIN_PERMISSIONS = {
  summaryRead: "registration_flows.view",
  editor: "registration_flows.manage",
  preview: "registration_flows.manage",
  mutate: "registration_flows.manage",
} as const;
