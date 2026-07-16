import { SystemRole } from "@/generated/prisma/enums";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_MS,
} from "@/lib/auth/cookie";

export { ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL_MS };

/** Roles allowed to access /admin Form Builder and CRM shells. */
export const ADMIN_PORTAL_ROLES: ReadonlySet<SystemRole> = new Set([
  SystemRole.ORGANIZATION_OWNER,
  SystemRole.ORGANIZATION_ADMIN,
  SystemRole.BRANCH_MANAGER,
  SystemRole.ADMISSIONS_MANAGER,
  SystemRole.ADMISSIONS_AGENT,
  SystemRole.ADVISOR,
  SystemRole.CALL_OPERATOR,
  SystemRole.REPORT_VIEWER,
  SystemRole.REGISTRATION_STAFF,
  SystemRole.CONTENT_MANAGER,
  SystemRole.PLATFORM_ADMIN,
]);

export function isAdminPortalRole(role: SystemRole): boolean {
  return ADMIN_PORTAL_ROLES.has(role);
}
