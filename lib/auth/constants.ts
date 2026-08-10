import { SystemRole } from "@/generated/prisma/enums";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_MS,
} from "@/lib/auth/cookie";

export { ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL_MS };

/** Portal-only roles — never admin login, never staff directory. */
export const PORTAL_ONLY_ROLES: ReadonlySet<SystemRole> = new Set([
  SystemRole.STUDENT,
  SystemRole.PARENT,
]);

/** Roles allowed to access /admin (staff / operators). */
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
  SystemRole.TEACHER,
  SystemRole.FINANCE,
  SystemRole.SUPPORT,
  SystemRole.PLATFORM_ADMIN,
]);

export function isPortalOnlyRole(role: SystemRole): boolean {
  return PORTAL_ONLY_ROLES.has(role);
}

export function isAdminPortalRole(role: SystemRole): boolean {
  return ADMIN_PORTAL_ROLES.has(role);
}

/** Prisma `role: { notIn }` helper for staff directory queries. */
export const PORTAL_ONLY_ROLE_LIST = [
  SystemRole.STUDENT,
  SystemRole.PARENT,
] as const;
