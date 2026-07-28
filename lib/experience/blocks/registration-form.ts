import type { BlockDefinition } from "@/lib/experience/definition-types";
import { lazyAdminBlock, lazyPublicBlock } from "@/lib/experience/blocks/lazy-loaders";
import {
  asRecord,
  readBoolean,
  readString,
  rejectForbiddenKeys,
} from "@/lib/experience/parse-utils";
import {
  SECTION_BODY_MAX,
  normalizeMultilineText,
  normalizePageBuilderText,
} from "@/lib/website/page-builder/constants";

export const REGISTRATION_FORM_BLOCK_TYPE = "REGISTRATION_FORM" as const;

const FORBIDDEN_BINDING_KEYS = [
  "formId",
  "formSlug",
  "formVersionId",
  "fields",
] as const;

export type RegistrationFormBlockConfig = {
  v: 1;
  introHeading?: string;
  introBody?: string;
  showStartButton?: boolean;
  startButtonLabel?: string;
};

const defaultConfig: RegistrationFormBlockConfig = {
  v: 1,
  showStartButton: true,
  startButtonLabel: "شروع ثبت‌نام",
};

function parseConfig(raw: unknown) {
  const obj = asRecord(raw);
  if (!obj) {
    return { ok: false as const, error: "پیکربندی فرم ثبت‌نام نامعتبر است." };
  }
  if (obj.v !== 1) {
    return {
      ok: false as const,
      error: "نسخه پیکربندی فرم ثبت‌نام پشتیبانی نمی‌شود.",
    };
  }

  const forbidden = rejectForbiddenKeys(obj, FORBIDDEN_BINDING_KEYS);
  if (!forbidden.ok) return forbidden;

  const config: RegistrationFormBlockConfig = { v: 1 };
  const introHeading = normalizePageBuilderText(readString(obj, "introHeading"), 160);
  const introBody = normalizeMultilineText(readString(obj, "introBody"), SECTION_BODY_MAX);
  const startButtonLabel = normalizePageBuilderText(
    readString(obj, "startButtonLabel"),
    80,
  );
  const showStartButton = readBoolean(obj, "showStartButton");
  if (introHeading) config.introHeading = introHeading;
  if (introBody) config.introBody = introBody;
  if (startButtonLabel) config.startButtonLabel = startButtonLabel;
  if (showStartButton !== undefined) config.showStartButton = showStartButton;
  return { ok: true as const, data: config };
}

export const registrationFormBlockDefinition = {
  type: REGISTRATION_FORM_BLOCK_TYPE,
  labelFa: "فرم ثبت‌نام",
  descriptionFa: "ورود به ویزارد ثبت‌نام متصل به فرم‌ساز (بدون تکرار فیلدها).",
  configVersion: 1,
  capabilities: {
    supportsVisibility: true,
    supportsScheduling: true,
    supportsAnimation: false,
    supportsTheme: true,
    supportsBindings: true,
  },
  defaultConfig,
  mediaRoles: [] as const,
  parseConfig,
  duplicateConfig: (
    config: RegistrationFormBlockConfig,
  ): RegistrationFormBlockConfig => ({ ...config }),
  extractMediaLinks: () => [],
  loadPublicRenderer: lazyPublicBlock<RegistrationFormBlockConfig>(
    () => import("@/components/experience/blocks/public/RegistrationFormBlockPublic"),
    "RegistrationFormBlockPublic",
  ),
  loadAdminEditor: lazyAdminBlock<RegistrationFormBlockConfig>(
    () => import("@/components/experience/blocks/admin/RegistrationFormBlockAdmin"),
    "RegistrationFormBlockAdmin",
  ),
} satisfies BlockDefinition<
  typeof REGISTRATION_FORM_BLOCK_TYPE,
  RegistrationFormBlockConfig
>;
