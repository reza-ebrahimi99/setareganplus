/**
 * Lightweight server-side operational logging.
 * Never log secrets, OTP, tokens, full import rows, or private notes.
 */

export type ServerLogCategory =
  | "security"
  | "integrity"
  | "import"
  | "analytics"
  | "media"
  | "mutation"
  | "system";

export type ServerLogFields = {
  module: string;
  action: string;
  category?: ServerLogCategory;
  organizationId?: string;
  userId?: string;
  recordId?: string;
  errorCode?: string;
  message?: string;
  /** Safe, non-PII metadata only. */
  meta?: Readonly<Record<string, string | number | boolean | null>>;
};

function serialize(fields: ServerLogFields, level: "info" | "warn" | "error") {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    category: fields.category ?? "system",
    module: fields.module,
    action: fields.action,
    organizationId: fields.organizationId ?? null,
    userId: fields.userId ?? null,
    recordId: fields.recordId ?? null,
    errorCode: fields.errorCode ?? null,
    message: fields.message ?? null,
    meta: fields.meta ?? null,
  });
}

export function logServerInfo(fields: ServerLogFields): void {
  console.info(serialize(fields, "info"));
}

export function logServerWarn(fields: ServerLogFields): void {
  console.warn(serialize(fields, "warn"));
}

export function logServerError(fields: ServerLogFields, error?: unknown): void {
  const safeMessage =
    fields.message ??
    (error instanceof Error ? error.name : "unknown_error");
  console.error(
    serialize(
      {
        ...fields,
        message: safeMessage,
        errorCode:
          fields.errorCode ??
          (error instanceof Error ? error.name : "UNKNOWN"),
      },
      "error",
    ),
  );
}
