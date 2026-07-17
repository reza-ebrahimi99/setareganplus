import assert from "node:assert/strict";
import {
  CrmStageType,
  LeadStatus,
  SystemRole,
} from "../generated/prisma/enums";
import type { AdminSessionContext } from "../lib/auth/require-admin";
import {
  buildCrmManagementAlerts,
  summarizeLeadGroups,
  type AdvisorLeadDistribution,
  type DashboardImportReport,
} from "../lib/crm/dashboard-insights";
import {
  leadListWhere,
  parseLeadListFilters,
} from "../lib/crm/lead-list-filters";

function session(
  role: SystemRole,
  branchIds: string[] = [],
): AdminSessionContext {
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
    session: {
      id: "session-test",
      expiresAt: new Date(Date.now() + 60_000),
    },
  };
}

const summary = summarizeLeadGroups(
  [
    {
      ownerUserId: "advisor-a",
      stageId: "active",
      status: LeadStatus.NEW,
      count: 12,
    },
    {
      ownerUserId: "advisor-a",
      stageId: "won",
      status: LeadStatus.NEW,
      count: 6,
    },
    {
      ownerUserId: "advisor-a",
      stageId: "lost",
      status: LeadStatus.NEW,
      count: 2,
    },
    {
      ownerUserId: null,
      stageId: null,
      status: LeadStatus.NEW,
      count: 4,
    },
  ],
  [
    {
      id: "active",
      stageType: CrmStageType.CONTACTED,
      isWon: false,
      isLost: false,
    },
    {
      id: "won",
      stageType: CrmStageType.WON,
      isWon: true,
      isLost: false,
    },
    {
      id: "lost",
      stageType: CrmStageType.LOST,
      isWon: false,
      isLost: true,
    },
  ],
  new Map([["advisor-a", "مشاور الف"]]),
);

assert.deepEqual(summary.overview, {
  total: 24,
  assigned: 20,
  unassigned: 4,
  registered: 6,
  lost: 2,
});
assert.deepEqual(summary.advisors[0], {
  ownerUserId: "advisor-a",
  ownerName: "مشاور الف",
  total: 20,
  active: 12,
  registered: 6,
  lost: 2,
  conversionRate: 30,
});

const advisorRows: AdvisorLeadDistribution[] = [
  {
    ownerUserId: "advisor-a",
    ownerName: "مشاور الف",
    total: 40,
    active: 30,
    registered: 8,
    lost: 2,
    conversionRate: 20,
  },
  {
    ownerUserId: "advisor-b",
    ownerName: "مشاور ب",
    total: 10,
    active: 8,
    registered: 1,
    lost: 1,
    conversionRate: 10,
  },
];
const importReport: DashboardImportReport = {
  id: "report-1",
  createdAt: new Date("2026-07-17T10:00:00Z"),
  importedBy: "مدیر",
  sourceFileName: "leads.xlsx",
  total: 20,
  created: 10,
  updated: 2,
  skipped: 3,
  invalid: 4,
  failed: 1,
  duplicates: 3,
  ownerDistribution: [],
};
const alerts = buildCrmManagementAlerts({
  unassigned: 5,
  importedUnassigned: 2,
  advisors: advisorRows,
  recentImports: [importReport],
});
assert.deepEqual(
  alerts.map((alert) => alert.id),
  [
    "unassigned",
    "imported-unassigned",
    "advisor-high-load",
    "import-invalid",
    "import-failed",
  ],
);

const agent = session(SystemRole.ADMISSIONS_AGENT, ["branch-a"]);
const forgedAgentWhere = leadListWhere(
  agent,
  parseLeadListFilters({
    scope: "all",
    ownerUserId: "another-advisor",
    assignment: "assigned",
  }),
);
assert.equal(
  forgedAgentWhere.ownerUserId,
  "user-test",
);
assert.deepEqual(forgedAgentWhere.branchId, { in: ["branch-a"] });

const managerWhere = leadListWhere(
  session(SystemRole.BRANCH_MANAGER, ["branch-a"]),
  parseLeadListFilters({
    scope: "all",
    ownerUserId: "advisor-a",
    sourceType: "IMPORT",
  }),
);
assert.equal(managerWhere.organizationId, "org-test");
assert.deepEqual(managerWhere.branchId, { in: ["branch-a"] });
assert.equal(managerWhere.ownerUserId, "advisor-a");
assert.equal(managerWhere.sourceType, "IMPORT");

console.log("✓ CRM dashboard aggregates and RBAC tests passed");
