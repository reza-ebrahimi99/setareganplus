export type PortalErrorCode =
  | "PORTAL_ACCESS_REQUIRED"
  | "PORTAL_LINK_INACTIVE"
  | "STUDENT_ACCESS_DENIED"
  | "GUARDIAN_ACCESS_DENIED"
  | "ORGANIZATION_MISMATCH"
  | "RELATION_PERMISSION_DENIED"
  | "INVALID_ARGUMENT"
  | "NOT_FOUND";

export class PortalError extends Error {
  readonly code: PortalErrorCode;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: PortalErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "PortalError";
    this.code = code;
    this.details = details;
  }
}

export function isPortalError(error: unknown): error is PortalError {
  return error instanceof PortalError;
}

export const PORTAL_NO_ACCESS_MESSAGE =
  "برای این شماره همراه دسترسی پرتال تعریف نشده است. لطفاً با مدرسه تماس بگیرید.";

export function persianPortalError(error: unknown): string {
  if (error instanceof PortalError) {
    switch (error.code) {
      case "PORTAL_ACCESS_REQUIRED":
      case "PORTAL_LINK_INACTIVE":
        return PORTAL_NO_ACCESS_MESSAGE;
      case "STUDENT_ACCESS_DENIED":
      case "GUARDIAN_ACCESS_DENIED":
      case "RELATION_PERMISSION_DENIED":
      case "ORGANIZATION_MISMATCH":
        return "دسترسی به این بخش مجاز نیست.";
      case "NOT_FOUND":
        return "مورد درخواستی یافت نشد.";
      default:
        return "امکان انجام درخواست وجود ندارد.";
    }
  }
  return "امکان انجام درخواست وجود ندارد.";
}
