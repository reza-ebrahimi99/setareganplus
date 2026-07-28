import {
  capacityBlockDefinition,
  CAPACITY_BLOCK_TYPE,
} from "@/lib/experience/blocks/capacity";
import {
  countdownBlockDefinition,
  COUNTDOWN_BLOCK_TYPE,
} from "@/lib/experience/blocks/countdown";
import { ctaBlockDefinition, CTA_BLOCK_TYPE } from "@/lib/experience/blocks/cta";
import {
  featuresBlockDefinition,
  FEATURES_BLOCK_TYPE,
} from "@/lib/experience/blocks/features";
import { heroBlockDefinition, HERO_BLOCK_TYPE } from "@/lib/experience/blocks/hero";
import { imageBlockDefinition, IMAGE_BLOCK_TYPE } from "@/lib/experience/blocks/image";
import {
  pricingBlockDefinition,
  PRICING_BLOCK_TYPE,
} from "@/lib/experience/blocks/pricing";
import {
  registrationFormBlockDefinition,
  REGISTRATION_FORM_BLOCK_TYPE,
} from "@/lib/experience/blocks/registration-form";
import {
  richTextBlockDefinition,
  RICH_TEXT_BLOCK_TYPE,
} from "@/lib/experience/blocks/rich-text";
import { spacerBlockDefinition, SPACER_BLOCK_TYPE } from "@/lib/experience/blocks/spacer";

/**
 * Single source of truth for experience block types, metadata, parsers, and UI resolution.
 * `ExperienceBlock.type` in the database is a string; always resolve through this registry.
 */
export const BLOCK_REGISTRY = {
  [HERO_BLOCK_TYPE]: heroBlockDefinition,
  [IMAGE_BLOCK_TYPE]: imageBlockDefinition,
  [RICH_TEXT_BLOCK_TYPE]: richTextBlockDefinition,
  [FEATURES_BLOCK_TYPE]: featuresBlockDefinition,
  [PRICING_BLOCK_TYPE]: pricingBlockDefinition,
  [COUNTDOWN_BLOCK_TYPE]: countdownBlockDefinition,
  [CAPACITY_BLOCK_TYPE]: capacityBlockDefinition,
  [REGISTRATION_FORM_BLOCK_TYPE]: registrationFormBlockDefinition,
  [CTA_BLOCK_TYPE]: ctaBlockDefinition,
  [SPACER_BLOCK_TYPE]: spacerBlockDefinition,
} as const;

export type ExperienceBlockType = keyof typeof BLOCK_REGISTRY;
export type AnyBlockDefinition = (typeof BLOCK_REGISTRY)[ExperienceBlockType];

export type BlockConfigByType = {
  [K in ExperienceBlockType]: (typeof BLOCK_REGISTRY)[K]["defaultConfig"];
};

export type AnyBlockConfig = BlockConfigByType[ExperienceBlockType];

export function isExperienceBlockType(value: string): value is ExperienceBlockType {
  return value in BLOCK_REGISTRY;
}

export function getBlockDefinition<Type extends ExperienceBlockType>(
  type: Type,
): (typeof BLOCK_REGISTRY)[Type];
export function getBlockDefinition(type: string): AnyBlockDefinition | null;
export function getBlockDefinition(type: string) {
  if (!isExperienceBlockType(type)) return null;
  return BLOCK_REGISTRY[type];
}

export function getDefaultBlockConfig<Type extends ExperienceBlockType>(
  type: Type,
): BlockConfigByType[Type] {
  return BLOCK_REGISTRY[type].defaultConfig as BlockConfigByType[Type];
}

/** Client-safe options for admin “add block” UI — derived from registry only. */
export const BLOCK_TYPE_OPTIONS = (
  Object.keys(BLOCK_REGISTRY) as ExperienceBlockType[]
).map((type) => ({
  type,
  labelFa: BLOCK_REGISTRY[type].labelFa,
  descriptionFa: BLOCK_REGISTRY[type].descriptionFa,
  categoryFa: BLOCK_REGISTRY[type].categoryFa,
  iconKey: BLOCK_REGISTRY[type].iconKey ?? null,
  capabilities: BLOCK_REGISTRY[type].capabilities,
  mediaRoles: BLOCK_REGISTRY[type].mediaRoles,
}));

export async function loadPublicBlockRenderer(type: ExperienceBlockType) {
  return BLOCK_REGISTRY[type].loadPublicRenderer();
}

export async function loadAdminBlockEditor(type: ExperienceBlockType) {
  return BLOCK_REGISTRY[type].loadAdminEditor();
}

/**
 * Build admin editor props with labels from the registry (never hardcode labels).
 */
export function adminEditorChromeFromRegistry(type: ExperienceBlockType): {
  labelFa: string;
  descriptionFa: string;
} {
  const definition = BLOCK_REGISTRY[type];
  return {
    labelFa: definition.labelFa,
    descriptionFa: definition.descriptionFa,
  };
}
