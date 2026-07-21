/**
 * Hand-rolled config validators (Zod is not a project dependency).
 * Public and admin paths both re-validate through these schemas.
 */

import {
  SECTION_ALT_MAX,
  SECTION_BODY_MAX,
  SECTION_BUTTON_LABEL_MAX,
  SECTION_CAPTION_MAX,
  SECTION_DESCRIPTION_MAX,
  SECTION_EYEBROW_MAX,
  SECTION_HEADLINE_MAX,
  SECTION_SUBHEADLINE_MAX,
  SECTION_TITLE_MAX,
  normalizeMultilineText,
  normalizePageBuilderText,
  type PageBuilderSectionType,
} from "./constants";
import { normalizeSafeHref } from "./safe-href";
import type {
  AnySectionConfig,
  CtaSectionConfig,
  HeroSectionConfig,
  ImageSectionConfig,
  RichTextSectionConfig,
  SectionCtaButton,
  SectionConfigByType,
  SpacerSectionConfig,
} from "./types";

export type ConfigParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readString(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  return typeof value === "string" ? value : "";
}

function parseButton(
  raw: unknown,
  label: string,
): ConfigParseResult<SectionCtaButton | undefined> {
  if (raw == null) return { ok: true, data: undefined };
  const obj = asRecord(raw);
  if (!obj) {
    return { ok: false, error: `${label} نامعتبر است.` };
  }
  const buttonLabel = normalizePageBuilderText(
    readString(obj, "label"),
    SECTION_BUTTON_LABEL_MAX,
  );
  const href = normalizeSafeHref(readString(obj, "href"));
  if (!buttonLabel && !href) return { ok: true, data: undefined };
  if (!buttonLabel || !href) {
    return {
      ok: false,
      error: `${label}: برچسب و پیوند هر دو الزامی هستند.`,
    };
  }
  return { ok: true, data: { label: buttonLabel, href } };
}

function parseHero(raw: unknown): ConfigParseResult<HeroSectionConfig> {
  const obj = asRecord(raw);
  if (!obj) return { ok: false, error: "پیکربندی هیرو نامعتبر است." };
  if (obj.v !== 1) return { ok: false, error: "نسخه پیکربندی هیرو پشتیبانی نمی‌شود." };

  const headline = normalizePageBuilderText(
    readString(obj, "headline"),
    SECTION_HEADLINE_MAX,
  );
  if (!headline) {
    return { ok: false, error: "عنوان هیرو الزامی است." };
  }

  const align = readString(obj, "align") || "start";
  if (align !== "start" && align !== "center") {
    return { ok: false, error: "چینش هیرو نامعتبر است." };
  }
  const overlay = readString(obj, "overlay") || "soft";
  if (overlay !== "none" && overlay !== "soft" && overlay !== "strong") {
    return { ok: false, error: "پوشش هیرو نامعتبر است." };
  }

  const primary = parseButton(obj.primaryCta, "دکمه اصلی");
  if (!primary.ok) return primary;
  const secondary = parseButton(obj.secondaryCta, "دکمه فرعی");
  if (!secondary.ok) return secondary;

  const config: HeroSectionConfig = {
    v: 1,
    headline,
    align,
    overlay,
  };
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
  return { ok: true, data: config };
}

function parseImage(raw: unknown): ConfigParseResult<ImageSectionConfig> {
  const obj = asRecord(raw);
  if (!obj) return { ok: false, error: "پیکربندی تصویر نامعتبر است." };
  if (obj.v !== 1) return { ok: false, error: "نسخه پیکربندی تصویر پشتیبانی نمی‌شود." };

  const aspect = readString(obj, "aspect") || "16/9";
  if (
    aspect !== "auto" &&
    aspect !== "16/9" &&
    aspect !== "4/3" &&
    aspect !== "1/1"
  ) {
    return { ok: false, error: "نسبت تصویر نامعتبر است." };
  }
  const objectFit = readString(obj, "objectFit") || "cover";
  if (objectFit !== "cover" && objectFit !== "contain") {
    return { ok: false, error: "حالت نمایش تصویر نامعتبر است." };
  }

  const config: ImageSectionConfig = { v: 1, aspect, objectFit };
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
  return { ok: true, data: config };
}

function parseRichText(raw: unknown): ConfigParseResult<RichTextSectionConfig> {
  const obj = asRecord(raw);
  if (!obj) return { ok: false, error: "پیکربندی متن نامعتبر است." };
  if (obj.v !== 1) return { ok: false, error: "نسخه پیکربندی متن پشتیبانی نمی‌شود." };

  const body = normalizeMultilineText(readString(obj, "body"), SECTION_BODY_MAX);
  if (!body) return { ok: false, error: "متن بدنه الزامی است." };

  const textAlign = readString(obj, "textAlign") || "start";
  if (textAlign !== "start" && textAlign !== "center") {
    return { ok: false, error: "چینش متن نامعتبر است." };
  }
  const maxWidth = readString(obj, "maxWidth") || "prose";
  if (maxWidth !== "prose" && maxWidth !== "wide" && maxWidth !== "full") {
    return { ok: false, error: "عرض متن نامعتبر است." };
  }

  const config: RichTextSectionConfig = { v: 1, body, textAlign, maxWidth };
  const title = normalizePageBuilderText(
    readString(obj, "title"),
    SECTION_TITLE_MAX,
  );
  if (title) config.title = title;
  return { ok: true, data: config };
}

function parseCta(raw: unknown): ConfigParseResult<CtaSectionConfig> {
  const obj = asRecord(raw);
  if (!obj) return { ok: false, error: "پیکربندی فراخوان نامعتبر است." };
  if (obj.v !== 1) return { ok: false, error: "نسخه پیکربندی فراخوان پشتیبانی نمی‌شود." };

  const title = normalizePageBuilderText(
    readString(obj, "title"),
    SECTION_TITLE_MAX,
  );
  if (!title) return { ok: false, error: "عنوان فراخوان الزامی است." };

  const align = readString(obj, "align") || "center";
  if (align !== "start" && align !== "center") {
    return { ok: false, error: "چینش فراخوان نامعتبر است." };
  }

  const primary = parseButton(obj.primaryCta, "دکمه اصلی");
  if (!primary.ok) return primary;
  const secondary = parseButton(obj.secondaryCta, "دکمه فرعی");
  if (!secondary.ok) return secondary;

  const config: CtaSectionConfig = { v: 1, title, align };
  const description = normalizePageBuilderText(
    readString(obj, "description"),
    SECTION_DESCRIPTION_MAX,
  );
  if (description) config.description = description;
  if (primary.data) config.primaryCta = primary.data;
  if (secondary.data) config.secondaryCta = secondary.data;
  return { ok: true, data: config };
}

function parseSpacer(raw: unknown): ConfigParseResult<SpacerSectionConfig> {
  const obj = asRecord(raw);
  if (!obj) return { ok: false, error: "پیکربندی فاصله‌گذار نامعتبر است." };
  if (obj.v !== 1) return { ok: false, error: "نسخه پیکربندی فاصله‌گذار پشتیبانی نمی‌شود." };

  const size = readString(obj, "size") || "md";
  if (size !== "sm" && size !== "md" && size !== "lg" && size !== "xl") {
    return { ok: false, error: "اندازه فاصله‌گذار نامعتبر است." };
  }
  return { ok: true, data: { v: 1, size } };
}

const PARSERS: {
  [K in PageBuilderSectionType]: (
    raw: unknown,
  ) => ConfigParseResult<SectionConfigByType[K]>;
} = {
  HERO: parseHero,
  IMAGE: parseImage,
  RICH_TEXT: parseRichText,
  CTA: parseCta,
  SPACER: parseSpacer,
};

export function parseSectionConfig<T extends PageBuilderSectionType>(
  type: T,
  raw: unknown,
): ConfigParseResult<SectionConfigByType[T]> {
  return PARSERS[type](raw) as ConfigParseResult<SectionConfigByType[T]>;
}

export function parseAnySectionConfig(
  type: string,
  raw: unknown,
): ConfigParseResult<{ type: PageBuilderSectionType; config: AnySectionConfig }> {
  if (!(type in PARSERS)) {
    return { ok: false, error: "نوع بخش ناشناخته است." };
  }
  const sectionType = type as PageBuilderSectionType;
  const parsed = parseSectionConfig(sectionType, raw);
  if (!parsed.ok) return parsed;
  return { ok: true, data: { type: sectionType, config: parsed.data } };
}
