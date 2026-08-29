/**
 * Choice options JSON contract for FormField.config:
 * { "options": [ { "value": "option-1", "label": "گزینه اول" } ] }
 */

export type ChoiceOption = {
  value: string;
  label: string;
};

export type ChoiceConfig = {
  options: ChoiceOption[];
};

export type ParseChoiceOptionsResult =
  | { ok: true; config: ChoiceConfig }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses one-option-per-line textarea input into the stored config contract.
 */
export function parseChoiceOptionsText(
  raw: string,
): ParseChoiceOptionsResult {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return {
      ok: false,
      error: "برای فیلدهای انتخابی حداقل دو گزینه لازم است.",
    };
  }

  const seenLabels = new Set<string>();
  const options: ChoiceOption[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const label = lines[index];
    const labelKey = label.toLocaleLowerCase("fa");

    if (seenLabels.has(labelKey)) {
      return {
        ok: false,
        error: "برچسب گزینه‌ها پس از حذف فاصله نباید تکراری باشد.",
      };
    }

    seenLabels.add(labelKey);
    options.push({
      value: `option-${index + 1}`,
      label,
    });
  }

  return { ok: true, config: { options } };
}

/**
 * Converts stored config back to editable one-per-line labels.
 */
export function choiceOptionsToText(config: unknown): string {
  const parsed = readChoiceConfig(config);
  if (!parsed) {
    return "";
  }
  return parsed.options.map((option) => option.label).join("\n");
}

export function readChoiceConfig(config: unknown): ChoiceConfig | null {
  if (!isRecord(config) || !Array.isArray(config.options)) {
    return null;
  }

  const options: ChoiceOption[] = [];

  for (const item of config.options) {
    if (!isRecord(item)) {
      return null;
    }
    if (typeof item.value !== "string" || typeof item.label !== "string") {
      return null;
    }
    options.push({ value: item.value, label: item.label });
  }

  if (options.length < 2) {
    return null;
  }

  return { options };
}
