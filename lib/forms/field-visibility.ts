/**
 * Conditional visibility contract inside FormField.config (foundation only).
 *
 * Example:
 * {
 *   "visibility": {
 *     "dependsOn": "grade",
 *     "operator": "equals",
 *     "value": "ششم"
 *   }
 * }
 *
 * No editor UI and no runtime application yet — parser + validation only.
 */

export const FIELD_VISIBILITY_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "is_empty",
  "is_not_empty",
] as const;

export type FieldVisibilityOperator =
  (typeof FIELD_VISIBILITY_OPERATORS)[number];

export type FieldVisibilityRule = {
  dependsOn: string;
  operator: FieldVisibilityOperator;
  value?: string | number | boolean | null;
};

export type ParseFieldVisibilityResult =
  | { ok: true; rule: FieldVisibilityRule | null }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOperator(value: unknown): value is FieldVisibilityOperator {
  return (
    typeof value === "string" &&
    (FIELD_VISIBILITY_OPERATORS as readonly string[]).includes(value)
  );
}

function operatorNeedsValue(operator: FieldVisibilityOperator): boolean {
  return operator !== "is_empty" && operator !== "is_not_empty";
}

function isAllowedValue(
  value: unknown,
): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/**
 * Reads and validates `config.visibility` when present.
 * Missing visibility → ok with rule null (field always visible by default).
 */
export function parseFieldVisibility(
  config: unknown,
): ParseFieldVisibilityResult {
  if (config == null) {
    return { ok: true, rule: null };
  }

  if (!isRecord(config)) {
    return { ok: false, error: "پیکربندی فیلد معتبر نیست." };
  }

  if (!("visibility" in config) || config.visibility == null) {
    return { ok: true, rule: null };
  }

  const visibility = config.visibility;
  if (!isRecord(visibility)) {
    return {
      ok: false,
      error: "قرارداد visibility باید یک شیء باشد.",
    };
  }

  const dependsOn =
    typeof visibility.dependsOn === "string"
      ? visibility.dependsOn.trim()
      : "";

  if (!dependsOn) {
    return {
      ok: false,
      error: "visibility.dependsOn باید کلید فیلد وابسته باشد.",
    };
  }

  if (!isOperator(visibility.operator)) {
    return {
      ok: false,
      error: `عملگر visibility نامعتبر است. مجاز: ${FIELD_VISIBILITY_OPERATORS.join(", ")}`,
    };
  }

  const operator = visibility.operator;

  if (operatorNeedsValue(operator)) {
    if (!("value" in visibility)) {
      return {
        ok: false,
        error: `برای عملگر «${operator}» مقدار visibility.value لازم است.`,
      };
    }
    if (!isAllowedValue(visibility.value)) {
      return {
        ok: false,
        error: "visibility.value باید رشته، عدد، بولین یا null باشد.",
      };
    }
    return {
      ok: true,
      rule: {
        dependsOn,
        operator,
        value: visibility.value,
      },
    };
  }

  return {
    ok: true,
    rule: {
      dependsOn,
      operator,
    },
  };
}

/**
 * Future-ready: evaluates a parsed rule against answer values.
 * Not wired into the public renderer yet.
 */
export function evaluateFieldVisibility(
  rule: FieldVisibilityRule | null,
  answers: Record<string, unknown>,
): boolean {
  if (!rule) {
    return true;
  }

  const raw = answers[rule.dependsOn];
  const asString =
    raw == null
      ? ""
      : Array.isArray(raw)
        ? raw.map(String).join(",")
        : String(raw);

  switch (rule.operator) {
    case "equals":
      return asString === String(rule.value ?? "");
    case "not_equals":
      return asString !== String(rule.value ?? "");
    case "contains":
      return asString.includes(String(rule.value ?? ""));
    case "not_contains":
      return !asString.includes(String(rule.value ?? ""));
    case "is_empty":
      return asString.trim().length === 0;
    case "is_not_empty":
      return asString.trim().length > 0;
    default:
      return true;
  }
}
