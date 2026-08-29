export {
  PortalError,
  PORTAL_NO_ACCESS_MESSAGE,
  isPortalError,
  persianPortalError,
  type PortalErrorCode,
} from "@/lib/portal/auth/errors";

export type {
  AuthorizedStudentContext,
  PortalAccountLinkSummary,
  PortalContext,
  PortalOrganization,
  PortalSessionUser,
} from "@/lib/portal/auth/types";

export { resolvePortalContext } from "@/lib/portal/auth/resolve-portal-context";
export {
  assertStudentVisible,
  requirePortalContext,
  requireStudentPortalAccess,
} from "@/lib/portal/auth/require-student-access";
export { requireGuardianPortalAccess } from "@/lib/portal/auth/require-guardian-access";
export {
  clearPortalSessionCookie,
  createPortalSession,
  readActivePortalLinkCookie,
  readPortalSessionToken,
  revokePortalSessionCookie,
  setActivePortalLinkCookie,
  setPortalSessionCookie,
} from "@/lib/portal/auth/session";
