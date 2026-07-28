import type { BlockDefinition } from "@/lib/experience/definition-types";
import { lazyAdminBlock, lazyPublicBlock } from "@/lib/experience/blocks/lazy-loaders";
import {
  extractMediaLinksForRoles,
  type BlockMediaRole,
} from "@/lib/experience/media-types";
import { asRecord, readString } from "@/lib/experience/parse-utils";
import {
  SECTION_ALT_MAX,
  SECTION_CAPTION_MAX,
  normalizePageBuilderText,
} from "@/lib/website/page-builder/constants";
import { normalizeSafeHref } from "@/lib/website/page-builder/safe-href";

export const IMAGE_BLOCK_TYPE = "IMAGE" as const;

export type ImageBlockConfig = {
  v: 1;
  caption?: string;
  altOverride?: string;
  aspect: "auto" | "16/9" | "4/3" | "1/1";
  objectFit: "cover" | "contain";
  linkHref?: string;
};

const MEDIA_ROLES = ["primary"] as const satisfies readonly BlockMediaRole[];

const defaultConfig: ImageBlockConfig = {
  v: 1,
  aspect: "16/9",
  objectFit: "cover",
};

function parseConfig(raw: unknown) {
  const obj = asRecord(raw);
  if (!obj) return { ok: false as const, error: "پیکربندی تصویر نامعتبر است." };
  if (obj.v !== 1) {
    return { ok: false as const, error: "نسخه پیکربندی تصویر پشتیبانی نمی‌شود." };
  }

  const aspect = readString(obj, "aspect") || "16/9";
  if (aspect !== "auto" && aspect !== "16/9" && aspect !== "4/3" && aspect !== "1/1") {
    return { ok: false as const, error: "نسبت تصویر نامعتبر است." };
  }
  const objectFit = readString(obj, "objectFit") || "cover";
  if (objectFit !== "cover" && objectFit !== "contain") {
    return { ok: false as const, error: "حالت نمایش تصویر نامعتبر است." };
  }

  const config: ImageBlockConfig = { v: 1, aspect, objectFit };
  const caption = normalizePageBuilderText(
    readString(obj, "caption"),
    SECTION_CAPTION_MAX,
  );
  const altOverride = normalizePageBuilderText(
    readString(obj, "altOverride"),
    SECTION_ALT_MAX,
  );
  const linkHref = normalizeSafeHref(readString(obj, "linkHref"));
  if (caption) config.caption = caption;
  if (altOverride) config.altOverride = altOverride;
  if (linkHref) config.linkHref = linkHref;
  return { ok: true as const, data: config };
}

export const imageBlockDefinition = {
  type: IMAGE_BLOCK_TYPE,
  labelFa: "تصویر",
  descriptionFa: "تصویر تمام‌عرض یا محدود با زیرنویس اختیاری.",
  categoryFa: "محتوا",
  iconKey: "image",
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
  duplicateConfig: (config: ImageBlockConfig): ImageBlockConfig => ({ ...config }),
  extractMediaLinks: (formMedia) => extractMediaLinksForRoles(MEDIA_ROLES, formMedia),
  loadPublicRenderer: lazyPublicBlock<ImageBlockConfig>(
    () => import("@/components/experience/blocks/public/ImageBlockPublic"),
    "ImageBlockPublic",
  ),
  loadAdminEditor: lazyAdminBlock<ImageBlockConfig>(
    () => import("@/components/experience/blocks/admin/ImageBlockAdmin"),
    "ImageBlockAdmin",
  ),
} satisfies BlockDefinition<typeof IMAGE_BLOCK_TYPE, ImageBlockConfig>;
