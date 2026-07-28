import type { BlockDefinition } from "@/lib/experience/definition-types";
import { lazyAdminBlock, lazyPublicBlock } from "@/lib/experience/blocks/lazy-loaders";
import {
  extractMediaLinksForRoles,
  type BlockMediaRole,
} from "@/lib/experience/media-types";
import { asRecord, readString } from "@/lib/experience/parse-utils";
import { parseExperienceCtaButton } from "@/lib/experience/blocks/shared/cta-button";
import {
  SECTION_EYEBROW_MAX,
  SECTION_HEADLINE_MAX,
  SECTION_SUBHEADLINE_MAX,
  normalizePageBuilderText,
} from "@/lib/website/page-builder/constants";

export const HERO_BLOCK_TYPE = "HERO" as const;

export type HeroBlockConfig = {
  v: 1;
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  align: "start" | "center";
  overlay: "none" | "soft" | "strong";
};

const MEDIA_ROLES = ["primary", "mobile"] as const satisfies readonly BlockMediaRole[];

const defaultConfig: HeroBlockConfig = {
  v: 1,
  headline: "عنوان هیرو",
  subheadline: "توضیح کوتاه زیر عنوان",
  align: "start",
  overlay: "soft",
};

function parseConfig(raw: unknown) {
  const obj = asRecord(raw);
  if (!obj) return { ok: false as const, error: "پیکربندی هیرو نامعتبر است." };
  if (obj.v !== 1) {
    return { ok: false as const, error: "نسخه پیکربندی هیرو پشتیبانی نمی‌شود." };
  }

  const headline = normalizePageBuilderText(
    readString(obj, "headline"),
    SECTION_HEADLINE_MAX,
  );
  if (!headline) {
    return { ok: false as const, error: "عنوان هیرو الزامی است." };
  }

  const align = readString(obj, "align") || "start";
  if (align !== "start" && align !== "center") {
    return { ok: false as const, error: "چینش هیرو نامعتبر است." };
  }
  const overlay = readString(obj, "overlay") || "soft";
  if (overlay !== "none" && overlay !== "soft" && overlay !== "strong") {
    return { ok: false as const, error: "پوشش هیرو نامعتبر است." };
  }

  const primary = parseExperienceCtaButton(obj.primaryCta, "دکمه اصلی");
  if (!primary.ok) return primary;
  const secondary = parseExperienceCtaButton(obj.secondaryCta, "دکمه فرعی");
  if (!secondary.ok) return secondary;

  const config: HeroBlockConfig = { v: 1, headline, align, overlay };
  const eyebrow = normalizePageBuilderText(
    readString(obj, "eyebrow"),
    SECTION_EYEBROW_MAX,
  );
  const subheadline = normalizePageBuilderText(
    readString(obj, "subheadline"),
    SECTION_SUBHEADLINE_MAX,
  );
  if (eyebrow) config.eyebrow = eyebrow;
  if (subheadline) config.subheadline = subheadline;
  if (primary.data) config.primaryCta = primary.data;
  if (secondary.data) config.secondaryCta = secondary.data;
  return { ok: true as const, data: config };
}

export const heroBlockDefinition = {
  type: HERO_BLOCK_TYPE,
  labelFa: "هیرو",
  descriptionFa: "بخش معرفی با عنوان، تصویر و دکمه‌های اقدام.",
  configVersion: 1,
  capabilities: {
    supportsVisibility: true,
    supportsScheduling: true,
    supportsAnimation: true,
    supportsTheme: true,
    supportsBindings: false,
  },
  defaultConfig,
  mediaRoles: MEDIA_ROLES,
  parseConfig,
  duplicateConfig: (config: HeroBlockConfig): HeroBlockConfig => ({
    ...config,
    primaryCta: config.primaryCta ? { ...config.primaryCta } : undefined,
    secondaryCta: config.secondaryCta ? { ...config.secondaryCta } : undefined,
  }),
  extractMediaLinks: (formMedia) => extractMediaLinksForRoles(MEDIA_ROLES, formMedia),
  loadPublicRenderer: lazyPublicBlock<HeroBlockConfig>(
    () => import("@/components/experience/blocks/public/HeroBlockPublic"),
    "HeroBlockPublic",
  ),
  loadAdminEditor: lazyAdminBlock<HeroBlockConfig>(
    () => import("@/components/experience/blocks/admin/HeroBlockAdmin"),
    "HeroBlockAdmin",
  ),
} satisfies BlockDefinition<typeof HERO_BLOCK_TYPE, HeroBlockConfig>;
