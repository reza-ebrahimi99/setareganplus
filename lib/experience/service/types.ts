/**
 * Shared result / error shapes for Experience services (admin-UI friendly).
 */

export type ExperienceErrorCode =
  | "NOT_FOUND"
  | "OWNER_NOT_FOUND"
  | "OWNER_ORG_MISMATCH"
  | "UNSUPPORTED_OWNER"
  | "UNSUPPORTED_PURPOSE"
  | "INVALID_STATE"
  | "DRAFT_EXISTS"
  | "NO_DRAFT"
  | "VERSION_NOT_DRAFT"
  | "VERSION_IMMUTABLE"
  | "VALIDATION_FAILED"
  | "CONFLICT"
  | "MEDIA_INVALID"
  | "BLOCK_TYPE_UNKNOWN"
  | "BLOCK_CONFIG_INVALID"
  | "UNEXPECTED";

export type ExperienceIssue = {
  code: ExperienceErrorCode | string;
  message: string;
  path?: string;
  blockId?: string;
  blockType?: string;
  details?: Record<string, string | number | boolean | null>;
};

export type ExperienceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ExperienceErrorCode; message: string; issues?: ExperienceIssue[] };

export function okResult<T>(data: T): ExperienceResult<T> {
  return { ok: true, data };
}

export function failResult(
  code: ExperienceErrorCode,
  message: string,
  issues?: ExperienceIssue[],
): ExperienceResult<never> {
  return { ok: false, code, message, issues };
}

export function issue(
  code: ExperienceErrorCode | string,
  message: string,
  extra?: Omit<ExperienceIssue, "code" | "message">,
): ExperienceIssue {
  return { code, message, ...extra };
}
