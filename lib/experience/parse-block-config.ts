import type { ConfigParseResult } from "@/lib/experience/definition-types";
import {
  getBlockDefinition,
  isExperienceBlockType,
  type AnyBlockConfig,
  type BlockConfigByType,
  type ExperienceBlockType,
} from "@/lib/experience/registry";

/**
 * Validate raw JSON from ExperienceBlock.config into a typed config.
 * All admin saves and public renders must call this before using config.
 */
export function parseExperienceBlockConfig<T extends ExperienceBlockType>(
  type: T,
  raw: unknown,
): ConfigParseResult<BlockConfigByType[T]> {
  const definition = getBlockDefinition(type);
  if (!definition) {
    return { ok: false, error: "نوع بلوک ناشناخته است." };
  }
  return definition.parseConfig(raw) as ConfigParseResult<BlockConfigByType[T]>;
}

export function parseExperienceBlockConfigFromRow(
  type: string,
  raw: unknown,
): ConfigParseResult<{ type: ExperienceBlockType; config: AnyBlockConfig }> {
  if (!isExperienceBlockType(type)) {
    return { ok: false, error: "نوع بلوک ناشناخته است." };
  }
  const parsed = parseExperienceBlockConfig(type, raw);
  if (!parsed.ok) return parsed;
  return { ok: true, data: { type, config: parsed.data } };
}
