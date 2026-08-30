/**
 * Env-driven SMS.ir Verify template IDs for commerce booklet SMS.
 *
 * Separate from smsir-provider.ts's own template config on purpose — the
 * provider's transport layer must not change (it already exposes a generic
 * sendPatternTemplate() that takes an arbitrary templateCode + parameters).
 * This module only resolves which of the three approved commerce templates
 * applies, straight from environment variables.
 */

export type BookletVerifyTemplateKind = "purchase" | "ready" | "admin";

const ENV_VAR_BY_KIND: Record<BookletVerifyTemplateKind, string> = {
  purchase: "SMSIR_PURCHASE_TEMPLATE_ID",
  ready: "SMSIR_READY_TEMPLATE_ID",
  admin: "SMSIR_ADMIN_TEMPLATE_ID",
};

function readPositiveIntegerString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? trimmed : null;
}

/** Returns the numeric template id as a string, or null if unset/invalid. */
export function readBookletVerifyTemplateId(
  kind: BookletVerifyTemplateKind,
): string | null {
  return readPositiveIntegerString(process.env[ENV_VAR_BY_KIND[kind]]);
}

export function isBookletVerifyTemplateConfigured(
  kind: BookletVerifyTemplateKind,
): boolean {
  return readBookletVerifyTemplateId(kind) !== null;
}
