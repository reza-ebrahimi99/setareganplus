/**
 * Section Registry — typed definitions for Page Builder Phase 1.
 */

import {
  PAGE_BUILDER_SECTION_TYPES,
  isPageBuilderSectionType,
  type PageBuilderSectionType,
} from "./constants";
import type {
  AnySectionConfig,
  CtaSectionConfig,
  HeroSectionConfig,
  ImageSectionConfig,
  ResolvedSectionMedia,
  RichTextSectionConfig,
  SectionConfigByType,
  SectionMediaLinkInput,
  SectionMediaRole,
  SpacerSectionConfig,
} from "./types";
import { parseSectionConfig, type ConfigParseResult } from "./validate-config";

export type SectionMediaMap = Partial<
  Record<SectionMediaRole, ResolvedSectionMedia>
>;

export type SectionRendererProps<T extends PageBuilderSectionType> = {
  config: SectionConfigByType[T];
  media: SectionMediaMap;
};

export type SectionDefinition<T extends PageBuilderSectionType> = {
  type: T;
  labelFa: string;
  configVersion: 1;
  defaultConfig: SectionConfigByType[T];
  /** Roles this section may bind via WebsitePageSectionMedia */
  mediaRoles: readonly SectionMediaRole[];
  parseConfig: (raw: unknown) => ConfigParseResult<SectionConfigByType[T]>;
  /**
   * Extract media link rows from admin form field values.
   * Form fields: mediaRole_<role> → mediaId
   */
  extractMediaLinks: (
    formMedia: Partial<Record<SectionMediaRole, string | null>>,
  ) => SectionMediaLinkInput[];
};

const defaultHero: HeroSectionConfig = {
  v: 1,
  headline: "عنوان هیرو",
  subheadline: "توضیح کوتاه زیر عنوان",
  align: "start",
  overlay: "soft",
};

const defaultImage: ImageSectionConfig = {
  v: 1,
  aspect: "16/9",
  objectFit: "cover",
};

const defaultRichText: RichTextSectionConfig = {
  v: 1,
  body: "متن بخش را اینجا بنویسید.",
  textAlign: "start",
  maxWidth: "prose",
};

const defaultCta: CtaSectionConfig = {
  v: 1,
  title: "فراخوان به اقدام",
  description: "یک جمله کوتاه برای تشویق کاربر.",
  align: "center",
};

const defaultSpacer: SpacerSectionConfig = {
  v: 1,
  size: "md",
};

function extractRoles(
  roles: readonly SectionMediaRole[],
  formMedia: Partial<Record<SectionMediaRole, string | null>>,
): SectionMediaLinkInput[] {
  const links: SectionMediaLinkInput[] = [];
  roles.forEach((role, index) => {
    const mediaId = formMedia[role]?.trim();
    if (mediaId) {
      links.push({ role, mediaId, sortOrder: index });
    }
  });
  return links;
}

export const SECTION_REGISTRY: {
  [K in PageBuilderSectionType]: SectionDefinition<K>;
} = {
  HERO: {
    type: "HERO",
    labelFa: "هیرو",
    configVersion: 1,
    defaultConfig: defaultHero,
    mediaRoles: ["primary", "mobile"] as const,
    parseConfig: (raw) => parseSectionConfig("HERO", raw),
    extractMediaLinks: (formMedia) =>
      extractRoles(["primary", "mobile"], formMedia),
  },
  IMAGE: {
    type: "IMAGE",
    labelFa: "تصویر",
    configVersion: 1,
    defaultConfig: defaultImage,
    mediaRoles: ["primary"] as const,
    parseConfig: (raw) => parseSectionConfig("IMAGE", raw),
    extractMediaLinks: (formMedia) => extractRoles(["primary"], formMedia),
  },
  RICH_TEXT: {
    type: "RICH_TEXT",
    labelFa: "متن",
    configVersion: 1,
    defaultConfig: defaultRichText,
    mediaRoles: [] as const,
    parseConfig: (raw) => parseSectionConfig("RICH_TEXT", raw),
    extractMediaLinks: () => [],
  },
  CTA: {
    type: "CTA",
    labelFa: "فراخوان",
    configVersion: 1,
    defaultConfig: defaultCta,
    mediaRoles: ["background"] as const,
    parseConfig: (raw) => parseSectionConfig("CTA", raw),
    extractMediaLinks: (formMedia) =>
      extractRoles(["background"], formMedia),
  },
  SPACER: {
    type: "SPACER",
    labelFa: "فاصله‌گذار",
    configVersion: 1,
    defaultConfig: defaultSpacer,
    mediaRoles: [] as const,
    parseConfig: (raw) => parseSectionConfig("SPACER", raw),
    extractMediaLinks: () => [],
  },
};

export function getSectionDefinition(
  type: string,
): SectionDefinition<PageBuilderSectionType> | null {
  if (!isPageBuilderSectionType(type)) return null;
  return SECTION_REGISTRY[type];
}

export function getDefaultSectionConfig(
  type: PageBuilderSectionType,
): AnySectionConfig {
  return SECTION_REGISTRY[type].defaultConfig;
}

/** Client-safe list for admin add-section UI */
export const SECTION_TYPE_OPTIONS = PAGE_BUILDER_SECTION_TYPES.map((type) => ({
  type,
  labelFa: SECTION_REGISTRY[type].labelFa,
}));
