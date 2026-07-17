import { CrmCallOutcome, SystemRole } from "../generated/prisma/enums";
import {
  PERMISSIONS,
  hasPermission,
  permissionsForRole,
  scopedLeadWhere,
} from "../lib/auth/permissions";
import type { AdminSessionContext } from "../lib/auth/require-admin";
import { STAFF_METRIC_DEFINITIONS } from "../lib/reports/staff-metric-definitions";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function session(role: SystemRole, branchIds: string[] = []): AdminSessionContext {
  return {
    user: {
      id: "user-test",
      email: null,
      mobile: null,
      firstName: "Test",
      lastName: "User",
      displayName: "Test User",
      isPlatformAdmin: false,
    },
    organization: { id: "org-test", slug: "test", name: "Test" },
    membership: {
      id: "membership-test",
      role,
      branchIds,
      allBranches: branchIds.length === 0,
    },
    session: { id: "session-test", expiresAt: new Date(Date.now() + 60_000) },
  };
}

const owner = session(SystemRole.ORGANIZATION_OWNER);
for (const permission of PERMISSIONS) {
  assert(hasPermission(owner, permission), `owner missing ${permission}`);
}
assert(permissionsForRole(SystemRole.ORGANIZATION_ADMIN).size === PERMISSIONS.length, "super admin must have all permissions");
assert(hasPermission(session(SystemRole.BRANCH_MANAGER, ["branch-a"]), "crm.view_all"), "branch manager CRM");
assert(hasPermission(session(SystemRole.BRANCH_MANAGER, ["branch-a"]), "crm.create_lead"), "branch manager lead intake");
assert(hasPermission(session(SystemRole.BRANCH_MANAGER, ["branch-a"]), "crm.import_leads"), "branch manager bulk import");
assert(!hasPermission(session(SystemRole.BRANCH_MANAGER), "settings.manage"), "branch manager settings blocked");
assert(hasPermission(session(SystemRole.ADMISSIONS_MANAGER), "crm.assign"), "admissions manager assignment");
assert(hasPermission(session(SystemRole.ADMISSIONS_MANAGER), "crm.import_leads"), "admissions manager bulk import");
assert(hasPermission(session(SystemRole.ADMISSIONS_AGENT), "crm.view_assigned"), "agent assigned view");
assert(hasPermission(session(SystemRole.ADMISSIONS_AGENT), "crm.create_lead"), "agent lead intake");
assert(hasPermission(session(SystemRole.ADMISSIONS_AGENT), "crm.send_sms"), "agent manual SMS");
assert(!hasPermission(session(SystemRole.ADMISSIONS_AGENT), "crm.import_leads"), "agent bulk import blocked");
assert(!hasPermission(session(SystemRole.ADMISSIONS_AGENT), "crm.view_all"), "agent all view blocked");
assert(!hasPermission(session(SystemRole.ADMISSIONS_AGENT), "crm.mark_won_lost"), "agent terminal transition blocked");
assert(hasPermission(session(SystemRole.CALL_OPERATOR), "crm.call"), "operator call permission");
assert(hasPermission(session(SystemRole.CALL_OPERATOR), "crm.send_sms"), "operator manual SMS");
assert(!hasPermission(session(SystemRole.CALL_OPERATOR), "crm.create_lead"), "operator lead intake blocked");
assert(!hasPermission(session(SystemRole.CALL_OPERATOR), "crm.assign"), "operator assignment blocked");
assert(hasPermission(session(SystemRole.ADVISOR), "booking.view_assigned"), "advisor booking permission");
assert(hasPermission(session(SystemRole.REPORT_VIEWER), "reports.view"), "report viewer reports");
assert(!hasPermission(session(SystemRole.REPORT_VIEWER), "crm.add_note"), "report viewer mutation blocked");

const agentScope = scopedLeadWhere(session(SystemRole.ADMISSIONS_AGENT, ["branch-a"]));
assert(agentScope.organizationId === "org-test", "tenant scope");
assert("ownerUserId" in agentScope, "agent scope includes assignment");
assert(agentScope.ownerUserId === "user-test", "assignment scope");
assert("branchId" in agentScope, "branch scope");
const ownerScope = scopedLeadWhere(owner);
assert(!("ownerUserId" in ownerScope), "owner sees org leads");
assert(!("branchId" in ownerScope), "all-branch owner scope");

assert(Object.values(CrmCallOutcome).length === 10, "call outcomes contract");
assert(CrmCallOutcome.REGISTERED === "REGISTERED", "registered outcome");
assert(CrmCallOutcome.NOT_INTERESTED === "NOT_INTERESTED", "lost outcome");
assert(Object.keys(STAFF_METRIC_DEFINITIONS).length === 12, "metric definitions");

console.log("✓ StarOS v0.8 staff/RBAC smoke tests passed");
