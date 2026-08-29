/**
 * Typed errors for the Academic Analytics Engine.
 * Callers should branch on `code` — never rely on generic `Error`.
 */

export type AnalyticsErrorCode =
  | "INVALID_ARGUMENT"
  | "NOT_FOUND"
  | "ORGANIZATION_SCOPE"
  | "INSUFFICIENT_DATA";

export class AnalyticsError extends Error {
  readonly code: AnalyticsErrorCode;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: AnalyticsErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "AnalyticsError";
    this.code = code;
    this.details = details;
  }
}

export function isAnalyticsError(error: unknown): error is AnalyticsError {
  return error instanceof AnalyticsError;
}

export function requireOrganizationId(organizationId: string): string {
  const value = organizationId?.trim();
  if (!value) {
    throw new AnalyticsError(
      "INVALID_ARGUMENT",
      "organizationId is required for analytics queries.",
      { field: "organizationId" },
    );
  }
  return value;
}

export function requireEntityId(field: string, value: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new AnalyticsError(
      "INVALID_ARGUMENT",
      `${field} is required for analytics queries.`,
      { field },
    );
  }
  return trimmed;
}
