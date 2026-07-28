import type { BlockDefinition } from "@/lib/experience/definition-types";
import { lazyAdminBlock, lazyPublicBlock } from "@/lib/experience/blocks/lazy-loaders";
import { asRecord, readString } from "@/lib/experience/parse-utils";
import {
  SECTION_BODY_MAX,
  SECTION_TITLE_MAX,
  normalizeMultilineText,
  normalizePageBuilderText,
} from "@/lib/website/page-builder/constants";

export const RICH_TEXT_BLOCK_TYPE = "RICH_TEXT" as const;

export type RichTextBlockConfig = {
  v: 1;
  title?: string;
  body: string;
  textAlign: "start" | "center";
  maxWidth: "prose" | "wide" | "full";
};

const defaultConfig: RichTextBlockConfig = {
  v: 1,
  body: "متن بخش را اینجا بنویسید.",
  textAlign: "start",
  maxWidth: "prose",
};

function parseConfig(raw: unknown) {
  const obj = asRecord(raw);
  if (!obj) return { ok: false as const, error: "پیکربندی متن نامعتبر است." };
  if (obj.v !== 1) {
    return { ok: false as const, error: "نسخه پیکربندی متن پشتیبانی نمی‌شود." };
  }

  const body = normalizeMultilineText(readString(obj, "body"), SECTION_BODY_MAX);
  if (!body) return { ok: false as const, error: "متن بدنه الزامی است." };

  const textAlign = readString(obj, "textAlign") || "start";
  if (textAlign !== "start" && textAlign !== "center") {
    return { ok: false as const, error: "چینش متن نامعتبر است." };
  }
  const maxWidth = readString(obj, "maxWidth") || "prose";
  if (maxWidth !== "prose" && maxWidth !== "wide" && maxWidth !== "full") {
    return { ok: false as const, error: "عرض متن نامعتبر است." };
  }

  const config: RichTextBlockConfig = { v: 1, body, textAlign, maxWidth };
  const title = normalizePageBuilderText(
    readString(obj, "title"),
    SECTION_TITLE_MAX,
  );
  if (title) config.title = title;
  return { ok: true as const, data: config };
}

export const richTextBlockDefinition = {
  type: RICH_TEXT_BLOCK_TYPE,
  labelFa: "متن",
  descriptionFa: "متن غنی با عنوان اختیاری.",
  configVersion: 1,
  capabilities: {
    supportsVisibility: true,
    supportsScheduling: true,
    supportsAnimation: true,
    supportsTheme: true,
    supportsBindings: false,
  },
  defaultConfig,
  mediaRoles: [] as const,
  parseConfig,
  duplicateConfig: (config: RichTextBlockConfig): RichTextBlockConfig => ({
    ...config,
  }),
  extractMediaLinks: () => [],
  loadPublicRenderer: lazyPublicBlock<RichTextBlockConfig>(
    () => import("@/components/experience/blocks/public/RichTextBlockPublic"),
    "RichTextBlockPublic",
  ),
  loadAdminEditor: lazyAdminBlock<RichTextBlockConfig>(
    () => import("@/components/experience/blocks/admin/RichTextBlockAdmin"),
    "RichTextBlockAdmin",
  ),
} satisfies BlockDefinition<typeof RICH_TEXT_BLOCK_TYPE, RichTextBlockConfig>;
