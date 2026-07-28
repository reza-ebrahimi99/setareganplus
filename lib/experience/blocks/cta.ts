import type { BlockDefinition } from "@/lib/experience/definition-types";
import { lazyAdminBlock, lazyPublicBlock } from "@/lib/experience/blocks/lazy-loaders";
import {
  extractMediaLinksForRoles,
  type BlockMediaRole,
} from "@/lib/experience/media-types";
import { asRecord, readString } from "@/lib/experience/parse-utils";
import { parseExperienceCtaButton } from "@/lib/experience/blocks/shared/cta-button";
import {
  SECTION_DESCRIPTION_MAX,
  SECTION_TITLE_MAX,
  normalizePageBuilderText,
} from "@/lib/website/page-builder/constants";

export const CTA_BLOCK_TYPE = "CTA" as const;

export type CtaBlockConfig = {
  v: 1;
  title: string;
  description?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  align: "start" | "center";
};

const MEDIA_ROLES = ["background"] as const satisfies readonly BlockMediaRole[];

const defaultConfig: CtaBlockConfig = {
  v: 1,
  title: "فراخوان به اقدام",
  description: "یک جمله کوتاه برای تشویق کاربر.",
  align: "center",
};

function parseConfig(raw: unknown) {
  const obj = asRecord(raw);
  if (!obj) return { ok: false as const, error: "پیکربندی فراخوان نامعتبر است." };
  if (obj.v !== 1) {
    return { ok: false as const, error: "نسخه پیکربندی فراخوان پشتیبانی نمی‌شود." };
  }

  const title = normalizePageBuilderText(
    readString(obj, "title"),
    SECTION_TITLE_MAX,
  );
  if (!title) return { ok: false as const, error: "عنوان فراخوان الزامی است." };

  const align = readString(obj, "align") || "center";
  if (align !== "start" && align !== "center") {
    return { ok: false as const, error: "چینش فراخوان نامعتبر است." };
  }

  const primary = parseExperienceCtaButton(obj.primaryCta, "دکمه اصلی");
  if (!primary.ok) return primary;
  const secondary = parseExperienceCtaButton(obj.secondaryCta, "دکمه فرعی");
  if (!secondary.ok) return secondary;

  const config: CtaBlockConfig = { v: 1, title, align };
  const description = normalizePageBuilderText(
    readString(obj, "description"),
    SECTION_DESCRIPTION_MAX,
  );
  if (description) config.description = description;
  if (primary.data) config.primaryCta = primary.data;
  if (secondary.data) config.secondaryCta = secondary.data;
  return { ok: true as const, data: config };
}

export const ctaBlockDefinition = {
  type: CTA_BLOCK_TYPE,
  labelFa: "فراخوان",
  descriptionFa: "بخش دعوت به اقدام با دکمه‌های پیوند.",
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
  duplicateConfig: (config: CtaBlockConfig): CtaBlockConfig => ({
    ...config,
    primaryCta: config.primaryCta ? { ...config.primaryCta } : undefined,
    secondaryCta: config.secondaryCta ? { ...config.secondaryCta } : undefined,
  }),
  extractMediaLinks: (formMedia) => extractMediaLinksForRoles(MEDIA_ROLES, formMedia),
  loadPublicRenderer: lazyPublicBlock<CtaBlockConfig>(
    () => import("@/components/experience/blocks/public/CtaBlockPublic"),
    "CtaBlockPublic",
  ),
  loadAdminEditor: lazyAdminBlock<CtaBlockConfig>(
    () => import("@/components/experience/blocks/admin/CtaBlockAdmin"),
    "CtaBlockAdmin",
  ),
} satisfies BlockDefinition<typeof CTA_BLOCK_TYPE, CtaBlockConfig>;
