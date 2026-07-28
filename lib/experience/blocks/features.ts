import type { BlockDefinition } from "@/lib/experience/definition-types";
import { lazyAdminBlock, lazyPublicBlock } from "@/lib/experience/blocks/lazy-loaders";
import { asRecord, readString } from "@/lib/experience/parse-utils";
import {
  SECTION_TITLE_MAX,
  normalizePageBuilderText,
} from "@/lib/website/page-builder/constants";

export const FEATURES_BLOCK_TYPE = "FEATURES" as const;

export type FeatureItemConfig = {
  title: string;
  description?: string;
  iconKey?: string;
};

export type FeaturesBlockConfig = {
  v: 1;
  title?: string;
  items: FeatureItemConfig[];
};

const ITEM_TITLE_MAX = 120;
const ITEM_DESC_MAX = 400;
const ICON_KEY_MAX = 64;
const MAX_ITEMS = 12;

const defaultConfig: FeaturesBlockConfig = {
  v: 1,
  items: [
    { title: "ویژگی اول", description: "توضیح کوتاه." },
    { title: "ویژگی دوم", description: "توضیح کوتاه." },
  ],
};

function parseItem(raw: unknown, index: number) {
  const obj = asRecord(raw);
  if (!obj) {
    return { ok: false as const, error: `آیتم ${index + 1} نامعتبر است.` };
  }
  const title = normalizePageBuilderText(
    readString(obj, "title"),
    ITEM_TITLE_MAX,
  );
  if (!title) {
    return { ok: false as const, error: `عنوان آیتم ${index + 1} الزامی است.` };
  }
  const item: FeatureItemConfig = { title };
  const description = normalizePageBuilderText(
    readString(obj, "description"),
    ITEM_DESC_MAX,
  );
  const iconKey = normalizePageBuilderText(
    readString(obj, "iconKey"),
    ICON_KEY_MAX,
  );
  if (description) item.description = description;
  if (iconKey) item.iconKey = iconKey;
  return { ok: true as const, data: item };
}

function parseConfig(raw: unknown) {
  const obj = asRecord(raw);
  if (!obj) return { ok: false as const, error: "پیکربندی ویژگی‌ها نامعتبر است." };
  if (obj.v !== 1) {
    return {
      ok: false as const,
      error: "نسخه پیکربندی ویژگی‌ها پشتیبانی نمی‌شود.",
    };
  }

  const rawItems = obj.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { ok: false as const, error: "حداقل یک ویژگی الزامی است." };
  }
  if (rawItems.length > MAX_ITEMS) {
    return { ok: false as const, error: `حداکثر ${MAX_ITEMS} ویژگی مجاز است.` };
  }

  const items: FeatureItemConfig[] = [];
  for (let i = 0; i < rawItems.length; i += 1) {
    const parsed = parseItem(rawItems[i], i);
    if (!parsed.ok) return parsed;
    items.push(parsed.data);
  }

  const config: FeaturesBlockConfig = { v: 1, items };
  const title = normalizePageBuilderText(
    readString(obj, "title"),
    SECTION_TITLE_MAX,
  );
  if (title) config.title = title;
  return { ok: true as const, data: config };
}

export const featuresBlockDefinition = {
  type: FEATURES_BLOCK_TYPE,
  labelFa: "ویژگی‌ها",
  descriptionFa: "فهرست مزایا یا نکات کلیدی با آیکن اختیاری.",
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
  duplicateConfig: (config: FeaturesBlockConfig): FeaturesBlockConfig => ({
    v: 1,
    title: config.title,
    items: config.items.map((item) => ({ ...item })),
  }),
  extractMediaLinks: () => [],
  loadPublicRenderer: lazyPublicBlock<FeaturesBlockConfig>(
    () => import("@/components/experience/blocks/public/FeaturesBlockPublic"),
    "FeaturesBlockPublic",
  ),
  loadAdminEditor: lazyAdminBlock<FeaturesBlockConfig>(
    () => import("@/components/experience/blocks/admin/FeaturesBlockAdmin"),
    "FeaturesBlockAdmin",
  ),
} satisfies BlockDefinition<typeof FEATURES_BLOCK_TYPE, FeaturesBlockConfig>;
