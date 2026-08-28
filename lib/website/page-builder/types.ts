/**
 * Typed section configs for Page Builder Phase 1.
 * Config never stores MediaAsset URLs or IDs — media lives in WebsitePageSectionMedia.
 */

import type { PageBuilderSectionType } from "./constants";

export type SectionCtaButton = {
  label: string;
  href: string;
};

export type HeroSectionConfig = {
  v: 1;
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  primaryCta?: SectionCtaButton;
  secondaryCta?: SectionCtaButton;
  align: "start" | "center";
  overlay: "none" | "soft" | "strong";
};

export type ImageSectionConfig = {
  v: 1;
  caption?: string;
  altOverride?: string;
  aspect: "auto" | "16/9" | "4/3" | "1/1";
  objectFit: "cover" | "contain";
  linkHref?: string;
};

export type RichTextSectionConfig = {
  v: 1;
  title?: string;
  body: string;
  textAlign: "start" | "center";
  maxWidth: "prose" | "wide" | "full";
};

export type CtaSectionConfig = {
  v: 1;
  title: string;
  description?: string;
  primaryCta?: SectionCtaButton;
  secondaryCta?: SectionCtaButton;
  align: "start" | "center";
};

export type SpacerSectionConfig = {
  v: 1;
  size: "sm" | "md" | "lg" | "xl";
};

export type SectionConfigByType = {
  HERO: HeroSectionConfig;
  IMAGE: ImageSectionConfig;
  RICH_TEXT: RichTextSectionConfig;
  CTA: CtaSectionConfig;
  SPACER: SpacerSectionConfig;
};

export type AnySectionConfig = SectionConfigByType[PageBuilderSectionType];

export type SectionMediaRole =
  | "primary"
  | "mobile"
  | "background";

export type SectionMediaLinkInput = {
  role: SectionMediaRole;
  mediaId: string;
  sortOrder: number;
};

export type ResolvedSectionMedia = {
  id: string;
  url: string;
  altText: string | null;
  title: string | null;
};
