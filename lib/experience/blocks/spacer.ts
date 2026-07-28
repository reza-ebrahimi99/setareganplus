import type { BlockDefinition } from "@/lib/experience/definition-types";
import { lazyAdminBlock, lazyPublicBlock } from "@/lib/experience/blocks/lazy-loaders";
import { asRecord, readString } from "@/lib/experience/parse-utils";

export const SPACER_BLOCK_TYPE = "SPACER" as const;

export type SpacerBlockConfig = {
  v: 1;
  size: "sm" | "md" | "lg" | "xl";
};

const defaultConfig: SpacerBlockConfig = {
  v: 1,
  size: "md",
};

function parseConfig(raw: unknown) {
  const obj = asRecord(raw);
  if (!obj) return { ok: false as const, error: "پیکربندی فاصله‌گذار نامعتبر است." };
  if (obj.v !== 1) {
    return {
      ok: false as const,
      error: "نسخه پیکربندی فاصله‌گذار پشتیبانی نمی‌شود.",
    };
  }

  const rawSize = readString(obj, "size") || "md";
  if (rawSize !== "sm" && rawSize !== "md" && rawSize !== "lg" && rawSize !== "xl") {
    return { ok: false as const, error: "اندازه فاصله‌گذار نامعتبر است." };
  }
  const size: SpacerBlockConfig["size"] = rawSize;
  return { ok: true as const, data: { v: 1 as const, size } };
}

export const spacerBlockDefinition = {
  type: SPACER_BLOCK_TYPE,
  labelFa: "فاصله‌گذار",
  descriptionFa: "فاصله عمودی بین بلوک‌ها.",
  categoryFa: "چیدمان",
  iconKey: "spacer",
  configVersion: 1,
  capabilities: {
    supportsVisibility: true,
    supportsScheduling: false,
    supportsAnimation: false,
    supportsTheme: true,
    supportsBindings: false,
  },
  defaultConfig,
  mediaRoles: [] as const,
  parseConfig,
  duplicateConfig: (config: SpacerBlockConfig): SpacerBlockConfig => ({ ...config }),
  extractMediaLinks: () => [],
  loadPublicRenderer: lazyPublicBlock<SpacerBlockConfig>(
    () => import("@/components/experience/blocks/public/SpacerBlockPublic"),
    "SpacerBlockPublic",
  ),
  loadAdminEditor: lazyAdminBlock<SpacerBlockConfig>(
    () => import("@/components/experience/blocks/admin/SpacerBlockAdmin"),
    "SpacerBlockAdmin",
  ),
} satisfies BlockDefinition<typeof SPACER_BLOCK_TYPE, SpacerBlockConfig>;
