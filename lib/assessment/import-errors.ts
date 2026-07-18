/**
 * Typed errors for the Assessment import pipeline.
 */

export type AssessmentImportErrorCode =
  | "FILE_TOO_LARGE"
  | "INVALID_FILE"
  | "INVALID_MIME"
  | "EMPTY_WORKBOOK"
  | "SHEET_NOT_FOUND"
  | "HEADER_NOT_FOUND"
  | "ASSESSMENT_NOT_FOUND"
  | "INVALID_MAPPING"
  | "VALIDATION_FAILED"
  | "IMPORT_FAILED"
  | "INVALID_ARGUMENT";

export class AssessmentImportError extends Error {
  readonly code: AssessmentImportErrorCode;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: AssessmentImportErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "AssessmentImportError";
    this.code = code;
    this.details = details;
  }
}

export function isAssessmentImportError(
  error: unknown,
): error is AssessmentImportError {
  return error instanceof AssessmentImportError;
}
