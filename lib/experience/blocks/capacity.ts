import type { BlockDefinition } from "@/lib/experience/definition-types";
import { lazyAdminBlock, lazyPublicBlock } from "@/lib/experience/blocks/lazy-loaders";
import {
  asRecord,
  readBoolean,
  readString,
  rejectForbiddenKeys,
} from "@/lib/experience/parse-utils";
import { normalizePageBuilderText } from "@/lib/website/page-builder/constants";

export const CAPACITY_BLOCK_TYPE = "CAPACITY" as const;

const FORBIDDEN_BINDING_KEYS = [
  "capacity",
  "registrationCount",
  "remainingCapacity",
  "isFull",
] as const;

export type CapacityBlockConfig = {
  v: 1;
  showRemaining?: boolean;
  fullMessage?: string;
  heading?: string;
};

const defaultConfig: CapacityBlockConfig = {
  v: 1,
  showRemaining: true,
};

function parseConfig(raw: unknown) {
  const obj = asRecord(raw);
  if (!obj) return { ok: false as const, error: "پیکربندی ظرفیت نامعتبر است." };
  if (obj.v !== 1) {
    return { ok: false as const, error: "نسخه پیکربندی ظرفیت پشتیبانی نمی‌شود." };
  }

  const forbidden = rejectForbiddenKeys(obj, FORBIDDEN_BINDING_KEYS);
  if (!forbidden.ok) return forbidden;

  const config: CapacityBlockConfig = { v: 1 };
  const showRemaining = readBoolean(obj, "showRemaining");
  if (showRemaining !== undefined) config.showRemaining = showRemaining;
  const heading = normalizePageBuilderText(readString(obj, "heading"), 120);
  const fullMessage = normalizePageBuilderText(readString(obj, "fullMessage"), 300);
  if (heading) config.heading = heading;
  if (fullMessage) config.fullMessage = fullMessage;
  return { ok: true as const, data: config };
}

export const capacityBlockDefinition = {
  type: CAPACITY_BLOCK_TYPE,
  labelFa: "ظرفیت",
  descriptionFa: "نمایش ظرفیت باقی‌مانده از جریان ثبت‌نام.",
  categoryFa: "پویا",
  iconKey: "capacity",
  configVersion: 1,
  capabilities: {
    supportsVisibility: true,
    supportsScheduling: true,
    supportsAnimation: true,
    supportsTheme: true,
    supportsBindings: true,
  },
  defaultConfig,
  mediaRoles: [] as const,
  parseConfig,
  duplicateConfig: (config: CapacityBlockConfig): CapacityBlockConfig => ({
    ...config,
  }),
  extractMediaLinks: () => [],
  loadPublicRenderer: lazyPublicBlock<CapacityBlockConfig>(
    () => import("@/components/experience/blocks/public/CapacityBlockPublic"),
    "CapacityBlockPublic",
  ),
  loadAdminEditor: lazyAdminBlock<CapacityBlockConfig>(
    () => import("@/components/experience/blocks/admin/CapacityBlockAdmin"),
    "CapacityBlockAdmin",
  ),
} satisfies BlockDefinition<typeof CAPACITY_BLOCK_TYPE, CapacityBlockConfig>;
