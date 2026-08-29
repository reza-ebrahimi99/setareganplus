/**
 * Canonical field visibility contract — FormField.visibilityConditions.
 *
 * Example:
 * {
 *   "sourceFieldKey": "needs_consultation",
 *   "operator": "equals",
 *   "value": "yes"
 * }
 *
 * Consent comparison values: boolean true/false or strings "true"/"false".
 * MULTIPLE_CHOICE answers are string[]; contains / notContains check membership.
 *
 * Legacy: config.visibility with dependsOn + snake_case operators is read for
 * compatibility only. New writes use visibilityConditions exclusively.
 */

export const VISIBILITY_OPERATORS = [
  "equals",
  "notEquals",
  "contains",
  "notContains",
  "isAnswered",
  "isNotAnswered",
] as const;

export type VisibilityOperator = (typeof VISIBILITY_OPERATORS)[number];

export type VisibilityCondition = {
  sourceFieldKey: string;
  operator: VisibilityOperator;
  value?: string | boolean;
};

export type VisibilityFieldMeta = {
  fieldKey: string;
  sortOrder: number;
  type: string;
  label: string;
  config?: unknown;
};

export type VisibilityAnswerValue =
  | string
  | string[]
  | boolean
  | number
  | null
  | undefined;

export type ParseVisibilityResult =
  | { ok: true; condition: VisibilityCondition | null }
  | { ok: false; error: string };

export type ValidateVisibilityResult =
  | { ok: true; condition: VisibilityCondition | null }
  | { ok: false; error: string };

const OPERATOR_LABELS: Record<VisibilityOperator, string> = {
  equals: "برابر باشد با",
  notEquals: "برابر نباشد با",
  contains: "شامل باشد",
  notContains: "شامل نباشد",
  isAnswered: "پاسخ داده شده باشد",
  isNotAnswered: "پاسخ داده نشده باشد",
};

/** Source types allowed as condition sources (INFORMATIONAL excluded). */
export const VISIBILITY_SOURCE_TYPES = [
  "SHORT_TEXT",
  "MOBILE",
  "EMAIL",
  "NATIONAL_ID",
  "NUMBER",
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "DROPDOWN",
  "GRADE",
  "ACADEMIC_TRACK",
  "CONSENT",
] as const;

const SOURCE_TYPE_SET = new Set<string>(VISIBILITY_SOURCE_TYPES);

const LEGACY_OPERATOR_MAP: Record<string, VisibilityOperator> = {
  equals: "equals",
  not_equals: "notEquals",
  notEquals: "notEquals",
  contains: "contains",
  not_contains: "notContains",
  notContains: "notContains",
  is_empty: "isNotAnswered",
  is_not_empty: "isAnswered",
  isAnswered: "isAnswered",
  isNotAnswered: "isNotAnswered",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOperator(value: unknown): value is VisibilityOperator {
  return (
    typeof value === "string" &&
    (VISIBILITY_OPERATORS as readonly string[]).includes(value)
  );
}

export function operatorNeedsValue(operator: VisibilityOperator): boolean {
  return operator !== "isAnswered" && operator !== "isNotAnswered";
}

export function getVisibilityOperatorLabel(operator: VisibilityOperator): string {
  return OPERATOR_LABELS[operator];
}

export function isVisibilitySourceType(type: string): boolean {
  return SOURCE_TYPE_SET.has(type);
}

export function operatorsForSourceType(type: string): VisibilityOperator[] {
  if (type === "MULTIPLE_CHOICE") {
    return ["contains", "notContains", "isAnswered", "isNotAnswered"];
  }
  if (type === "CONSENT") {
    return ["equals", "notEquals", "isAnswered", "isNotAnswered"];
  }
  if (
    type === "SINGLE_CHOICE" ||
    type === "DROPDOWN" ||
    type === "GRADE" ||
    type === "ACADEMIC_TRACK" ||
    type === "NUMBER"
  ) {
    return ["equals", "notEquals", "isAnswered", "isNotAnswered"];
  }
  // text-like
  return ["equals", "notEquals", "contains", "notContains", "isAnswered", "isNotAnswered"];
}

function normalizeOperator(raw: unknown): VisibilityOperator | null {
  if (typeof raw !== "string") {
    return null;
  }
  return LEGACY_OPERATOR_MAP[raw] ?? (isOperator(raw) ? raw : null);
}

function normalizeConditionValue(
  value: unknown,
): string | boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}

function parseConditionObject(raw: unknown): ParseVisibilityResult {
  if (raw == null) {
    return { ok: true, condition: null };
  }

  if (!isRecord(raw)) {
    return { ok: false, error: "شرط نمایش باید یک شیء معتبر باشد." };
  }

  const sourceFieldKeyRaw =
    typeof raw.sourceFieldKey === "string"
      ? raw.sourceFieldKey
      : typeof raw.dependsOn === "string"
        ? raw.dependsOn
        : "";
  const sourceFieldKey = sourceFieldKeyRaw.trim();

  if (!sourceFieldKey) {
    return {
      ok: false,
      error: "کلید سؤال مبنا در شرط نمایش الزامی است.",
    };
  }

  const operator = normalizeOperator(raw.operator);
  if (!operator) {
    return {
      ok: false,
      error: `عملگر شرط نمایش نامعتبر است. مجاز: ${VISIBILITY_OPERATORS.join(", ")}`,
    };
  }

  if (!operatorNeedsValue(operator)) {
    return {
      ok: true,
      condition: { sourceFieldKey, operator },
    };
  }

  if (!("value" in raw)) {
    return {
      ok: false,
      error: `برای عملگر «${getVisibilityOperatorLabel(operator)}» مقدار مقایسه لازم است.`,
    };
  }

  const value = normalizeConditionValue(raw.value);
  if (value === undefined || value === null) {
    return {
      ok: false,
      error: "مقدار مقایسه شرط نمایش نامعتبر است.",
    };
  }

  return {
    ok: true,
    condition: { sourceFieldKey, operator, value },
  };
}

/**
 * Parse canonical visibilityConditions JSON (or null).
 */
export function parseVisibilityConditions(
  raw: unknown,
): ParseVisibilityResult {
  return parseConditionObject(raw);
}

/**
 * Legacy read of config.visibility — for safe compatibility only.
 */
export function parseLegacyConfigVisibility(
  config: unknown,
): ParseVisibilityResult {
  if (!isRecord(config) || !("visibility" in config)) {
    return { ok: true, condition: null };
  }
  return parseConditionObject(config.visibility);
}

/**
 * Prefer visibilityConditions; fall back to legacy config.visibility.
 */
export function resolveFieldVisibilityCondition(params: {
  visibilityConditions: unknown;
  config?: unknown;
}): ParseVisibilityResult {
  const primary = parseVisibilityConditions(params.visibilityConditions);
  if (!primary.ok) {
    return primary;
  }
  if (primary.condition) {
    return primary;
  }
  return parseLegacyConfigVisibility(params.config);
}

/** @deprecated Use parseVisibilityConditions / resolveFieldVisibilityCondition. */
export function parseFieldVisibility(config: unknown): ParseVisibilityResult {
  return parseLegacyConfigVisibility(config);
}

export type FieldVisibilityRule = {
  dependsOn: string;
  operator: VisibilityOperator;
  value?: string | boolean;
};

/** @deprecated Prefer VisibilityCondition. */
export function toLegacyRule(
  condition: VisibilityCondition | null,
): FieldVisibilityRule | null {
  if (!condition) {
    return null;
  }
  return {
    dependsOn: condition.sourceFieldKey,
    operator: condition.operator,
    value: condition.value,
  };
}

function readChoiceOptionValues(config: unknown): Set<string> | null {
  if (!isRecord(config) || !Array.isArray(config.options)) {
    return null;
  }
  const values = new Set<string>();
  for (const item of config.options) {
    if (!isRecord(item) || typeof item.value !== "string") {
      continue;
    }
    const trimmed = item.value.trim();
    if (trimmed) {
      values.add(trimmed);
    }
  }
  return values.size > 0 ? values : null;
}

function normalizeConsentCompare(value: string | boolean): "true" | "false" | null {
  if (value === true || value === "true" || value === "yes" || value === "بله") {
    return "true";
  }
  if (value === false || value === "false" || value === "no" || value === "خیر") {
    return "false";
  }
  return null;
}

/**
 * Validate a condition against the form version field list.
 * Does not mutate — returns Persian errors suitable for admin/publish UI.
 */
export function validateVisibilityConditionForField(params: {
  dependentFieldKey: string;
  dependentLabel: string;
  visibilityConditions: unknown;
  config?: unknown;
  fields: VisibilityFieldMeta[];
}): ValidateVisibilityResult {
  const parsed = resolveFieldVisibilityCondition({
    visibilityConditions: params.visibilityConditions,
    config: params.config,
  });

  if (!parsed.ok) {
    return {
      ok: false,
      error: `شرط نمایش «${params.dependentLabel}»: ${parsed.error}`,
    };
  }

  if (!parsed.condition) {
    return { ok: true, condition: null };
  }

  const condition = parsed.condition;
  const byKey = new Map(params.fields.map((field) => [field.fieldKey, field]));
  const dependent = byKey.get(params.dependentFieldKey);
  const source = byKey.get(condition.sourceFieldKey);

  if (!source) {
    return {
      ok: false,
      error: `شرط نمایش «${params.dependentLabel}»: سؤال مبنا یافت نشد.`,
    };
  }

  if (condition.sourceFieldKey === params.dependentFieldKey) {
    return {
      ok: false,
      error: `شرط نمایش «${params.dependentLabel}»: سؤال نمی‌تواند به خودش وابسته باشد.`,
    };
  }

  if (source.type === "INFORMATIONAL") {
    return {
      ok: false,
      error: `شرط نمایش «${params.dependentLabel}»: سؤال راهنما نمی‌تواند مبنا باشد.`,
    };
  }

  if (!isVisibilitySourceType(source.type)) {
    return {
      ok: false,
      error: `شرط نمایش «${params.dependentLabel}»: نوع سؤال مبنا پشتیبانی نمی‌شود.`,
    };
  }

  if (dependent && source.sortOrder >= dependent.sortOrder) {
    return {
      ok: false,
      error: `شرط نمایش «${params.dependentLabel}»: سؤال مبنا باید قبل از این سؤال باشد.`,
    };
  }

  const allowedOps = operatorsForSourceType(source.type);
  if (!allowedOps.includes(condition.operator)) {
    return {
      ok: false,
      error: `شرط نمایش «${params.dependentLabel}»: عملگر با نوع سؤال مبنا سازگار نیست.`,
    };
  }

  if (operatorNeedsValue(condition.operator)) {
    if (condition.value === undefined) {
      return {
        ok: false,
        error: `شرط نمایش «${params.dependentLabel}»: مقدار مقایسه الزامی است.`,
      };
    }

    if (source.type === "CONSENT") {
      if (normalizeConsentCompare(condition.value) == null) {
        return {
          ok: false,
          error: `شرط نمایش «${params.dependentLabel}»: برای رضایت‌نامه فقط بله/خیر مجاز است.`,
        };
      }
    }

    if (
      source.type === "SINGLE_CHOICE" ||
      source.type === "MULTIPLE_CHOICE" ||
      source.type === "DROPDOWN" ||
      source.type === "GRADE" ||
      source.type === "ACADEMIC_TRACK"
    ) {
      const options = readChoiceOptionValues(source.config);
      if (options) {
        const compare =
          typeof condition.value === "boolean"
            ? condition.value
              ? "true"
              : "false"
            : String(condition.value);
        if (!options.has(compare)) {
          return {
            ok: false,
            error: `شرط نمایش «${params.dependentLabel}»: مقدار مقایسه در گزینه‌های سؤال مبنا نیست.`,
          };
        }
      }
    }
  }

  return { ok: true, condition };
}

/**
 * Detect dependency cycles across a version's visibility rules.
 * Returns Persian error or null when acyclic.
 */
export function detectVisibilityCycles(
  fields: Array<{
    fieldKey: string;
    label: string;
    visibilityConditions: unknown;
    config?: unknown;
  }>,
): string | null {
  const edges = new Map<string, string>();
  const labels = new Map<string, string>();

  for (const field of fields) {
    labels.set(field.fieldKey, field.label);
    const parsed = resolveFieldVisibilityCondition({
      visibilityConditions: field.visibilityConditions,
      config: field.config,
    });
    if (!parsed.ok || !parsed.condition) {
      continue;
    }
    edges.set(field.fieldKey, parsed.condition.sourceFieldKey);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(node: string, stack: string[]): string | null {
    if (visiting.has(node)) {
      const cycleStart = stack.indexOf(node);
      const cycle =
        cycleStart >= 0 ? stack.slice(cycleStart).concat(node) : [node];
      const names = cycle.map((key) => labels.get(key) ?? key).join(" ← ");
      return `چرخه وابستگی در شرط نمایش: ${names}`;
    }
    if (visited.has(node)) {
      return null;
    }
    visiting.add(node);
    const next = edges.get(node);
    if (next) {
      const err = visit(next, [...stack, node]);
      if (err) {
        return err;
      }
    }
    visiting.delete(node);
    visited.add(node);
    return null;
  }

  for (const key of edges.keys()) {
    const err = visit(key, []);
    if (err) {
      return err;
    }
  }

  return null;
}

function isAnsweredValue(raw: VisibilityAnswerValue): boolean {
  if (raw == null) {
    return false;
  }
  if (typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw === "number") {
    return true;
  }
  if (Array.isArray(raw)) {
    return raw.length > 0;
  }
  return String(raw).trim().length > 0;
}

function asComparableString(raw: VisibilityAnswerValue): string {
  if (raw == null) {
    return "";
  }
  if (typeof raw === "boolean") {
    return raw ? "true" : "false";
  }
  if (Array.isArray(raw)) {
    return raw.map(String).join("\u0000");
  }
  return String(raw);
}

function asStringList(raw: VisibilityAnswerValue): string[] {
  if (Array.isArray(raw)) {
    return raw.map(String);
  }
  if (raw == null || raw === false) {
    return [];
  }
  if (typeof raw === "boolean") {
    return raw ? ["true"] : [];
  }
  const text = String(raw).trim();
  return text ? [text] : [];
}

function compareEquals(
  raw: VisibilityAnswerValue,
  expected: string | boolean | undefined,
  sourceType?: string,
): boolean {
  if (expected === undefined) {
    return false;
  }

  if (sourceType === "CONSENT" || typeof raw === "boolean") {
    const want = normalizeConsentCompare(expected);
    const got =
      typeof raw === "boolean"
        ? raw
          ? "true"
          : "false"
        : normalizeConsentCompare(asComparableString(raw));
    return want != null && got != null && want === got;
  }

  if (Array.isArray(raw)) {
    // Single-value equality against multi: true if exactly one selected and matches
    return raw.length === 1 && String(raw[0]) === String(expected);
  }

  return asComparableString(raw) === String(expected);
}

/**
 * Pure evaluator — shared by client and server.
 * Missing/null condition → always visible.
 * Malformed condition should be rejected before calling; if passed null, visible.
 */
export function evaluateVisibilityCondition(
  condition: VisibilityCondition | null,
  answers: Record<string, VisibilityAnswerValue>,
  sourceType?: string,
): boolean {
  if (!condition) {
    return true;
  }

  const raw = answers[condition.sourceFieldKey];

  switch (condition.operator) {
    case "equals":
      return compareEquals(raw, condition.value, sourceType);
    case "notEquals":
      return !compareEquals(raw, condition.value, sourceType);
    case "contains": {
      const needle = String(condition.value ?? "");
      if (Array.isArray(raw) || sourceType === "MULTIPLE_CHOICE") {
        return asStringList(raw).includes(needle);
      }
      return asComparableString(raw).includes(needle);
    }
    case "notContains": {
      const needle = String(condition.value ?? "");
      if (Array.isArray(raw) || sourceType === "MULTIPLE_CHOICE") {
        return !asStringList(raw).includes(needle);
      }
      return !asComparableString(raw).includes(needle);
    }
    case "isAnswered":
      return isAnsweredValue(raw);
    case "isNotAnswered":
      return !isAnsweredValue(raw);
    default:
      return true;
  }
}

/** @deprecated Use evaluateVisibilityCondition. */
export function evaluateFieldVisibility(
  rule: FieldVisibilityRule | null,
  answers: Record<string, unknown>,
): boolean {
  if (!rule) {
    return true;
  }
  return evaluateVisibilityCondition(
    {
      sourceFieldKey: rule.dependsOn,
      operator: rule.operator,
      value: rule.value,
    },
    answers as Record<string, VisibilityAnswerValue>,
  );
}

/**
 * Evaluate visibility for every field in sort order.
 * Answers for hidden fields should be cleared by the caller.
 */
export function evaluateAllFieldVisibility(params: {
  fields: Array<{
    fieldKey: string;
    type: string;
    visibilityConditions: unknown;
    config?: unknown;
  }>;
  answers: Record<string, VisibilityAnswerValue>;
}):
  | { ok: true; visible: Record<string, boolean> }
  | { ok: false; error: string } {
  const visible: Record<string, boolean> = {};
  const byKey = new Map(params.fields.map((field) => [field.fieldKey, field]));

  for (const field of params.fields) {
    const parsed = resolveFieldVisibilityCondition({
      visibilityConditions: field.visibilityConditions,
      config: field.config,
    });
    if (!parsed.ok) {
      return {
        ok: false,
        error: "پیکربندی شرط نمایش فرم نامعتبر است. لطفاً با پشتیبانی تماس بگیرید.",
      };
    }

    const sourceType = parsed.condition
      ? byKey.get(parsed.condition.sourceFieldKey)?.type
      : undefined;

    visible[field.fieldKey] = evaluateVisibilityCondition(
      parsed.condition,
      params.answers,
      sourceType,
    );
  }

  return { ok: true, visible };
}

export function serializeVisibilityCondition(
  condition: VisibilityCondition | null,
): VisibilityCondition | null {
  if (!condition) {
    return null;
  }
  if (!operatorNeedsValue(condition.operator)) {
    return {
      sourceFieldKey: condition.sourceFieldKey,
      operator: condition.operator,
    };
  }
  return {
    sourceFieldKey: condition.sourceFieldKey,
    operator: condition.operator,
    value: condition.value,
  };
}
