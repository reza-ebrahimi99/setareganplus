import { SystemRole, type SystemRole as SystemRoleValue } from "@/generated/prisma/enums";
import type { AdminSessionContext } from "@/lib/auth/require-admin";

export const PERMISSIONS = [
  "staff.manage",
  "crm.view_all",
  "crm.view_assigned",
  "crm.create_lead",
  "crm.import_leads",
  "crm.assign",
  "crm.change_stage",
  "crm.mark_won_lost",
  "crm.add_note",
  "crm.create_task",
  "crm.complete_task",
  "crm.call",
  "crm.send_sms",
  "booking.view_all",
  "booking.view_assigned",
  "reports.view",
  "settings.manage",
  "forms.manage",
  "communication.manage",
  "automations.manage",
  "website.manage",
  "students.portal.manage",
  "registrations.view",
  "registrations.manage",
  "portal.student.access",
  "portal.guardian.access",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type LeadScopeFilter = "all" | "mine" | "unassigned";

const ALL = new Set<Permission>(PERMISSIONS);
const CRM_MANAGER = new Set<Permission>([
  "crm.view_all",
  "crm.view_assigned",
  "crm.create_lead",
  "crm.import_leads",
  "crm.assign",
  "crm.change_stage",
  "crm.mark_won_lost",
  "crm.add_note",
  "crm.create_task",
  "crm.complete_task",
  "crm.call",
  "crm.send_sms",
  "booking.view_all",
  "booking.view_assigned",
  "reports.view",
  "registrations.view",
  "registrations.manage",
]);
const CRM_AGENT = new Set<Permission>([
  "crm.view_assigned",
  "crm.create_lead",
  "crm.change_stage",
  "crm.add_note",
  "crm.create_task",
  "crm.complete_task",
  "crm.call",
  "crm.send_sms",
  "booking.view_assigned",
  "registrations.view",
]);

export const ROLE_LABELS: Readonly<Record<SystemRoleValue, string>> = {
  PLATFORM_ADMIN: "مدیر سامانه",
  ORGANIZATION_OWNER: "مالک",
  ORGANIZATION_ADMIN: "مدیر ارشد",
  BRANCH_MANAGER: "مدیر شعبه",
  ADMISSIONS_MANAGER: "مدیر پذیرش",
  ADMISSIONS_AGENT: "کارشناس پذیرش",
  ADVISOR: "مشاور",
  CALL_OPERATOR: "اپراتور تماس",
  REPORT_VIEWER: "مشاهده‌گر گزارش",
  TEACHER: "مدرس",
  FINANCE: "امور مالی",
  REGISTRATION_STAFF: "کارشناس ثبت‌نام",
  SUPPORT: "پشتیبانی",
  CONTENT_MANAGER: "مدیر محتوا",
  STUDENT: "دانش‌آموز",
  PARENT: "والد",
};

export const STAFF_ASSIGNABLE_ROLES = [
  SystemRole.ORGANIZATION_ADMIN,
  SystemRole.BRANCH_MANAGER,
  SystemRole.ADMISSIONS_MANAGER,
  SystemRole.ADMISSIONS_AGENT,
  SystemRole.ADVISOR,
  SystemRole.CALL_OPERATOR,
  SystemRole.REPORT_VIEWER,
] as const;

const ROLE_PERMISSIONS: Readonly<Partial<Record<SystemRoleValue, ReadonlySet<Permission>>>> = {
  PLATFORM_ADMIN: ALL,
  ORGANIZATION_OWNER: ALL,
  ORGANIZATION_ADMIN: ALL,
  BRANCH_MANAGER: CRM_MANAGER,
  ADMISSIONS_MANAGER: CRM_MANAGER,
  ADMISSIONS_AGENT: CRM_AGENT,
  ADVISOR: new Set([
    "crm.view_assigned",
    "crm.add_note",
    "crm.create_task",
    "crm.complete_task",
    "crm.call",
    "crm.send_sms",
    "booking.view_assigned",
  ]),
  CALL_OPERATOR: new Set([
    "crm.view_assigned",
    "crm.add_note",
    "crm.create_task",
    "crm.complete_task",
    "crm.call",
    "crm.send_sms",
  ]),
  REPORT_VIEWER: new Set(["reports.view"]),
  REGISTRATION_STAFF: new Set<Permission>([
    ...CRM_AGENT,
    "students.portal.manage",
    "registrations.view",
    "registrations.manage",
  ]),
  SUPPORT: new Set(["crm.view_assigned", "crm.add_note", "crm.call", "crm.send_sms"]),
  CONTENT_MANAGER: new Set([
    "forms.manage",
    "website.manage",
    "students.portal.manage",
  ]),
  FINANCE: new Set(["reports.view"]),
  STUDENT: new Set(["portal.student.access"]),
  PARENT: new Set(["portal.guardian.access"]),
};


export function permissionsForRole(role: SystemRoleValue): ReadonlySet<Permission> {
  return ROLE_PERMISSIONS[role] ?? new Set<Permission>();
}

export function hasPermission(
  session: Pick<AdminSessionContext, "membership" | "user">,
  permission: Permission,
): boolean {
  return (
    session.user.isPlatformAdmin ||
    permissionsForRole(session.membership.role).has(permission)
  );
}

export function assertPermission(
  session: Pick<AdminSessionContext, "membership" | "user">,
  permission: Permission,
): void {
  if (!hasPermission(session, permission)) {
    throw new Error("FORBIDDEN");
  }
}

export function scopedBranchWhere(session: AdminSessionContext):
  | Record<string, never>
  | { branchId: { in: string[] } } {
  return session.membership.allBranches
    ? {}
    : { branchId: { in: session.membership.branchIds } };
}

export function scopedLeadWhere(session: AdminSessionContext) {
  return scopedLeadWhereForFilter(session, "all");
}

export function normalizeLeadScopeFilter(
  session: Pick<AdminSessionContext, "membership" | "user">,
  requested: string | null | undefined,
): LeadScopeFilter {
  if (!hasPermission(session, "crm.view_all")) return "mine";
  return requested === "mine" || requested === "unassigned" ? requested : "all";
}

export function scopedLeadWhereForFilter(
  session: AdminSessionContext,
  requested: string | null | undefined,
) {
  const branch = scopedBranchWhere(session);
  const scope = normalizeLeadScopeFilter(session, requested);
  const base = {
    organizationId: session.organization.id,
    deletedAt: null,
    ...branch,
  };
  if (scope === "all") return base;
  if (scope === "unassigned") return { ...base, ownerUserId: null };
  return { ...base, ownerUserId: session.user.id };
}
