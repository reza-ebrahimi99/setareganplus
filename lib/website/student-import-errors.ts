export class StudentImportError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "StudentImportError";
    this.code = code;
  }
}

export function isStudentImportError(
  error: unknown,
): error is StudentImportError {
  return error instanceof StudentImportError;
}
