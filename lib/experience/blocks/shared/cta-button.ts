import {
  SECTION_BUTTON_LABEL_MAX,
  normalizePageBuilderText,
} from "@/lib/website/page-builder/constants";
import { normalizeSafeHref } from "@/lib/website/page-builder/safe-href";
import type { ConfigParseResult } from "@/lib/experience/definition-types";
import { asRecord, readString } from "@/lib/experience/parse-utils";

export type ExperienceCtaButton = {
  label: string;
  href: string;
};

export function parseExperienceCtaButton(
  raw: unknown,
  fieldLabel: string,
): ConfigParseResult<ExperienceCtaButton | undefined> {
  if (raw == null) return { ok: true, data: undefined };
  const obj = asRecord(raw);
  if (!obj) {
    return { ok: false, error: `${fieldLabel} نامعتبر است.` };
  }
  const label = normalizePageBuilderText(
    readString(obj, "label"),
    SECTION_BUTTON_LABEL_MAX,
  );
  const href = normalizeSafeHref(readString(obj, "href"));
  if (!label && !href) return { ok: true, data: undefined };
  if (!label || !href) {
    return {
      ok: false,
      error: `${fieldLabel}: برچسب و پیوند هر دو الزامی هستند.`,
    };
  }
  return { ok: true, data: { label, href } };
}
