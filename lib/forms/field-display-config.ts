/**
 * Optional display hints stored inside FormField.config.
 *
 * Columns helpText / placeholder remain authoritative when set;
 * config may also carry helpText, placeholder, and prefix.
 *
 * Example:
 * {
 *   "helpText": "فقط رقم وارد کنید",
 *   "placeholder": "۰۹۱۲…",
 *   "prefix": "+۹۸"
 * }
 */

export type FieldDisplayConfig = {
  helpText: string | null;
  placeholder: string | null;
  prefix: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Reads display hints from config without failing on unknown keys.
 */
export function parseFieldDisplayConfig(config: unknown): FieldDisplayConfig {
  if (!isRecord(config)) {
    return { helpText: null, placeholder: null, prefix: null };
  }

  return {
    helpText: readOptionalString(config.helpText),
    placeholder: readOptionalString(config.placeholder),
    prefix: readOptionalString(config.prefix),
  };
}

/**
 * Resolves effective help / placeholder / prefix for public rendering.
 * Column values win over config when both are present.
 */
export function resolveFieldDisplayHints(field: {
  helpText: string | null;
  placeholder: string | null;
  config: unknown;
}): FieldDisplayConfig {
  const fromConfig = parseFieldDisplayConfig(field.config);
  const columnHelp = readOptionalString(field.helpText);
  const columnPlaceholder = readOptionalString(field.placeholder);

  return {
    helpText: columnHelp ?? fromConfig.helpText,
    placeholder: columnPlaceholder ?? fromConfig.placeholder,
    prefix: fromConfig.prefix,
  };
}
