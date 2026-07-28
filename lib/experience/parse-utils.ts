/**
 * Internal JSON parsing helpers for experience block configs.
 * Not a source of block metadata — use BLOCK_REGISTRY only.
 */

import type { ConfigParseResult } from "@/lib/experience/definition-types";

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function readString(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  return typeof value === "string" ? value : "";
}

export function readBoolean(
  obj: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = obj[key];
  return typeof value === "boolean" ? value : undefined;
}

/** Reject dynamic binding keys smuggled into presentation config. */
export function rejectForbiddenKeys(
  obj: Record<string, unknown>,
  forbidden: readonly string[],
): ConfigParseResult<void> {
  for (const key of forbidden) {
    if (key in obj) {
      return {
        ok: false,
        error: `فیلد «${key}» در پیکربندی بلوک مجاز نیست؛ از موتور جریان ثبت‌نام استفاده کنید.`,
      };
    }
  }
  return { ok: true, data: undefined };
}
