import type { BlockDefinition } from "@/lib/experience/definition-types";
import { lazyAdminBlock, lazyPublicBlock } from "@/lib/experience/blocks/lazy-loaders";
import {
  asRecord,
  readBoolean,
  readString,
  rejectForbiddenKeys,
} from "@/lib/experience/parse-utils";
import { normalizePageBuilderText } from "@/lib/website/page-builder/constants";

export const COUNTDOWN_BLOCK_TYPE = "COUNTDOWN" as const;

const FORBIDDEN_BINDING_KEYS = [
  "discountStartsAt",
  "discountEndsAt",
  "saleAmountRials",
  "endsAtIso",
] as const;

export type CountdownBlockConfig = {
  v: 1;
  showWhenInactive?: boolean;
  heading?: string;
};

const defaultConfig: CountdownBlockConfig = {
  v: 1,
  showWhenInactive: false,
};

function parseConfig(raw: unknown) {
  const obj = asRecord(raw);
  if (!obj) return { ok: false as const, error: "پیکربندی شمارش معکوس نامعتبر است." };
  if (obj.v !== 1) {
    return {
      ok: false as const,
      error: "نسخه پیکربندی شمارش معکوس پشتیبانی نمی‌شود.",
    };
  }

  const forbidden = rejectForbiddenKeys(obj, FORBIDDEN_BINDING_KEYS);
  if (!forbidden.ok) return forbidden;

  const config: CountdownBlockConfig = { v: 1 };
  const showWhenInactive = readBoolean(obj, "showWhenInactive");
  if (showWhenInactive !== undefined) config.showWhenInactive = showWhenInactive;
  const heading = normalizePageBuilderText(readString(obj, "heading"), 120);
  if (heading) config.heading = heading;
  return { ok: true as const, data: config };
}

export const countdownBlockDefinition = {
  type: COUNTDOWN_BLOCK_TYPE,
  labelFa: "شمارش معکوس",
  descriptionFa: "نمایش زمان باقی‌مانده تخفیف از پنجره زمانی جریان ثبت‌نام.",
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
  duplicateConfig: (config: CountdownBlockConfig): CountdownBlockConfig => ({
    ...config,
  }),
  extractMediaLinks: () => [],
  loadPublicRenderer: lazyPublicBlock<CountdownBlockConfig>(
    () => import("@/components/experience/blocks/public/CountdownBlockPublic"),
    "CountdownBlockPublic",
  ),
  loadAdminEditor: lazyAdminBlock<CountdownBlockConfig>(
    () => import("@/components/experience/blocks/admin/CountdownBlockAdmin"),
    "CountdownBlockAdmin",
  ),
} satisfies BlockDefinition<typeof COUNTDOWN_BLOCK_TYPE, CountdownBlockConfig>;
