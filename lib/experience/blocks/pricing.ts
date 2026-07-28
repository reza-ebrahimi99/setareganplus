import type { BlockDefinition } from "@/lib/experience/definition-types";
import { lazyAdminBlock, lazyPublicBlock } from "@/lib/experience/blocks/lazy-loaders";
import {
  asRecord,
  readBoolean,
  readString,
  rejectForbiddenKeys,
} from "@/lib/experience/parse-utils";
import { normalizePageBuilderText } from "@/lib/website/page-builder/constants";

export const PRICING_BLOCK_TYPE = "PRICING" as const;

const FORBIDDEN_BINDING_KEYS = [
  "paymentAmountRials",
  "saleAmountRials",
  "paymentMode",
  "pricingBadge",
  "discountStartsAt",
  "discountEndsAt",
  "finalAmountRials",
  "discountRials",
] as const;

export type PricingBlockConfig = {
  v: 1;
  showPaymentModeLabel?: boolean;
  variant?: "card" | "compact";
  sectionTitle?: string;
};

const defaultConfig: PricingBlockConfig = {
  v: 1,
  showPaymentModeLabel: true,
  variant: "card",
};

function parseConfig(raw: unknown) {
  const obj = asRecord(raw);
  if (!obj) return { ok: false as const, error: "پیکربندی قیمت‌گذاری نامعتبر است." };
  if (obj.v !== 1) {
    return {
      ok: false as const,
      error: "نسخه پیکربندی قیمت‌گذاری پشتیبانی نمی‌شود.",
    };
  }

  const forbidden = rejectForbiddenKeys(obj, FORBIDDEN_BINDING_KEYS);
  if (!forbidden.ok) return forbidden;

  const variant = readString(obj, "variant") || "card";
  if (variant !== "card" && variant !== "compact") {
    return { ok: false as const, error: "نوع نمایش قیمت نامعتبر است." };
  }

  const config: PricingBlockConfig = { v: 1, variant };
  const showPaymentModeLabel = readBoolean(obj, "showPaymentModeLabel");
  if (showPaymentModeLabel !== undefined) {
    config.showPaymentModeLabel = showPaymentModeLabel;
  }
  const sectionTitle = normalizePageBuilderText(readString(obj, "sectionTitle"), 120);
  if (sectionTitle) config.sectionTitle = sectionTitle;
  return { ok: true as const, data: config };
}

export const pricingBlockDefinition = {
  type: PRICING_BLOCK_TYPE,
  labelFa: "قیمت‌گذاری",
  descriptionFa: "نمایش قیمت و تخفیف از موتور جریان ثبت‌نام (بدون ذخیره مبلغ در بلوک).",
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
  duplicateConfig: (config: PricingBlockConfig): PricingBlockConfig => ({ ...config }),
  extractMediaLinks: () => [],
  loadPublicRenderer: lazyPublicBlock<PricingBlockConfig>(
    () => import("@/components/experience/blocks/public/PricingBlockPublic"),
    "PricingBlockPublic",
  ),
  loadAdminEditor: lazyAdminBlock<PricingBlockConfig>(
    () => import("@/components/experience/blocks/admin/PricingBlockAdmin"),
    "PricingBlockAdmin",
  ),
} satisfies BlockDefinition<typeof PRICING_BLOCK_TYPE, PricingBlockConfig>;
