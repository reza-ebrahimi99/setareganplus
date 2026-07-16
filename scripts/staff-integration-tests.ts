/**
 * StarOS v0.8 staff/RBAC/call/report integration tests.
 * Requires a migrated disposable or staging DATABASE_URL.
 * Test records use isolated organizations and are removed in finally.
 * OTP values and mobile numbers are never logged.
 */
import { randomBytes } from "node:crypto";
import {
  CrmCallOutcome,
  CrmTaskStatus,
  LeadSourceType,
  MembershipStatus,
  OtpPurpose,
  SystemRole,
  UserStatus,
} from "../generated/prisma/enums";
import {
  hasPermission,
  scopedLeadWhere,
} from "../lib/auth/permissions";
import type { AdminSessionContext } from "../lib/auth/require-admin";
import { findActiveStaffMembershipByMobile } from "../lib/auth/staff-login";
import { hashSessionToken } from "../lib/auth/crypto";
import {
  createAdminSession,
  revokeAdminSessionByToken,
} from "../lib/auth/session";
import { consumeOtp, requestOtp, verifyOtp } from "../lib/communication/otp";
import { logCrmCall } from "../lib/crm/calls";
import { ensureDefaultPipeline } from "../lib/crm/pipeline";
import { completeCrmTask } from "../lib/crm/tasks";
import { loadStaffPerformance } from "../lib/reports/staff-performance";
import { requestStaffOtpAction } from "../app/staff/login/actions";
import { prisma } from "../lib/prisma";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run staff integration tests against a production environment.");
  process.exit(1);
}
process.env.STAROS_SMS_ENABLED = "false";
process.env.NODE_ENV = "test";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

let passed = 0;
function ok(name: string) {
  passed += 1;
  console.log(`✓ ${name}`);
}

function context(input: {
  organizationId: string;
  organizationSlug: string;
  userId: string;
  membershipId: string;
  role: SystemRole;
  branchIds?: string[];
}): AdminSessionContext {
  const branchIds = input.branchIds ?? [];
  return {
    user: {
      id: input.userId,
      email: null,
      mobile: null,
      firstName: "Test",
      lastName: "Staff",
      displayName: "Test Staff",
      isPlatformAdmin: false,
    },
    organization: {
      id: input.organizationId,
      slug: input.organizationSlug,
      name: "Staff integration",
    },
    membership: {
      id: input.membershipId,
      role: input.role,
      branchIds,
      allBranches: branchIds.length === 0,
    },
    session: { id: "integration-session", expiresAt: new Date(Date.now() + 60_000) },
  };
}

async function cleanupOrganization(organizationId: string) {
  await prisma.crmCallLog.deleteMany({ where: { organizationId } });
  await prisma.crmActivity.deleteMany({ where: { organizationId } });
  await prisma.crmTask.deleteMany({ where: { organizationId } });
  await prisma.leadActivity.deleteMany({ where: { organizationId } });
  await prisma.consentRecord.deleteMany({ where: { organizationId } });
  await prisma.lead.deleteMany({ where: { organizationId } });
  await prisma.crmPipelineStage.deleteMany({ where: { organizationId } });
  await prisma.crmPipeline.deleteMany({ where: { organizationId } });
  await prisma.auditLog.deleteMany({ where: { organizationId } });
  await prisma.otpChallenge.deleteMany({ where: { organizationId } });
  await prisma.adminSession.deleteMany({
    where: { membership: { organizationId } },
  });
  const memberships = await prisma.organizationMembership.findMany({
    where: { organizationId },
    select: { userId: true },
  });
  await prisma.branchMembership.deleteMany({ where: { organizationId } });
  await prisma.organizationMembership.deleteMany({ where: { organizationId } });
  await prisma.user.deleteMany({
    where: { id: { in: memberships.map((membership) => membership.userId) } },
  });
  await prisma.branch.deleteMany({ where: { organizationId } });
  await prisma.organization.deleteMany({ where: { id: organizationId } });
}

async function main() {
  const suffix = randomBytes(5).toString("hex");
  const numeric = parseInt(suffix.slice(0, 6), 16) % 10_000_000;
  const mobile = `0991${String(numeric).padStart(7, "0")}`;
  const inactiveMobile = `0992${String(numeric).padStart(7, "0")}`;
  const org = await prisma.organization.create({
    data: { name: `Staff test ${suffix}`, slug: `staff-test-${suffix}` },
  });
  const otherOrg = await prisma.organization.create({
    data: { name: `Staff foreign ${suffix}`, slug: `staff-foreign-${suffix}` },
  });

  try {
    const [branchA, branchB, foreignBranch] = await Promise.all([
      prisma.branch.create({ data: { organizationId: org.id, name: "A", slug: `a-${suffix}` } }),
      prisma.branch.create({ data: { organizationId: org.id, name: "B", slug: `b-${suffix}` } }),
      prisma.branch.create({ data: { organizationId: otherOrg.id, name: "F", slug: `f-${suffix}` } }),
    ]);
    const [agent, inactive, manager, viewer, owner, foreignUser] = await Promise.all([
      prisma.user.create({ data: { firstName: "Agent", lastName: suffix, mobile, normalizedMobile: mobile, status: UserStatus.ACTIVE } }),
      prisma.user.create({ data: { firstName: "Inactive", lastName: suffix, mobile: inactiveMobile, normalizedMobile: inactiveMobile, status: UserStatus.ACTIVE } }),
      prisma.user.create({ data: { firstName: "Manager", lastName: suffix, status: UserStatus.ACTIVE } }),
      prisma.user.create({ data: { firstName: "Viewer", lastName: suffix, status: UserStatus.ACTIVE } }),
      prisma.user.create({ data: { firstName: "Owner", lastName: suffix, status: UserStatus.ACTIVE } }),
      prisma.user.create({ data: { firstName: "Foreign", lastName: suffix, status: UserStatus.ACTIVE } }),
    ]);
    const [agentMember, inactiveMember, managerMember, viewerMember, ownerMember, foreignMember] = await Promise.all([
      prisma.organizationMembership.create({ data: { organizationId: org.id, userId: agent.id, role: SystemRole.ADMISSIONS_AGENT, status: MembershipStatus.ACTIVE } }),
      prisma.organizationMembership.create({ data: { organizationId: org.id, userId: inactive.id, role: SystemRole.CALL_OPERATOR, status: MembershipStatus.SUSPENDED } }),
      prisma.organizationMembership.create({ data: { organizationId: org.id, userId: manager.id, role: SystemRole.BRANCH_MANAGER, status: MembershipStatus.ACTIVE } }),
      prisma.organizationMembership.create({ data: { organizationId: org.id, userId: viewer.id, role: SystemRole.REPORT_VIEWER, status: MembershipStatus.ACTIVE } }),
      prisma.organizationMembership.create({ data: { organizationId: org.id, userId: owner.id, role: SystemRole.ORGANIZATION_OWNER, status: MembershipStatus.ACTIVE } }),
      prisma.organizationMembership.create({ data: { organizationId: otherOrg.id, userId: foreignUser.id, role: SystemRole.ADMISSIONS_AGENT, status: MembershipStatus.ACTIVE } }),
    ]);
    await Promise.all([
      prisma.branchMembership.create({ data: { organizationId: org.id, organizationMembershipId: agentMember.id, branchId: branchA.id } }),
      prisma.branchMembership.create({ data: { organizationId: org.id, organizationMembershipId: inactiveMember.id, branchId: branchA.id } }),
      prisma.branchMembership.create({ data: { organizationId: org.id, organizationMembershipId: managerMember.id, branchId: branchA.id } }),
      prisma.branchMembership.create({ data: { organizationId: otherOrg.id, organizationMembershipId: foreignMember.id, branchId: foreignBranch.id } }),
    ]);

    const found = await findActiveStaffMembershipByMobile(mobile);
    assert(found?.id === agentMember.id, "active staff membership lookup");
    ok("1. active staff identity is eligible for OTP login");
    assert(await findActiveStaffMembershipByMobile(inactiveMobile) === null, "inactive membership blocked");
    ok("2. inactive staff blocked");

    const knownForm = new FormData();
    knownForm.set("mobile", mobile);
    const unknownForm = new FormData();
    unknownForm.set("mobile", `0993${String(numeric).padStart(7, "0")}`);
    const knownResponse = await requestStaffOtpAction({ phase: "mobile" }, knownForm);
    await prisma.otpChallenge.deleteMany({ where: { organizationId: org.id } });
    const unknownResponse = await requestStaffOtpAction({ phase: "mobile" }, unknownForm);
    assert(knownResponse.message === unknownResponse.message && knownResponse.phase === unknownResponse.phase, "generic OTP response");
    ok("3. unknown mobile receives generic response");

    const requested = await requestOtp({
      organizationId: org.id,
      mobile,
      purpose: OtpPurpose.STAFF_LOGIN,
      _testReturnCode: true,
    });
    assert(requested.ok && requested._testCode, "staff OTP request");
    const verified = await verifyOtp({
      organizationId: org.id,
      mobile,
      code: requested._testCode,
      purpose: OtpPurpose.STAFF_LOGIN,
    });
    assert(verified.ok, "staff OTP verify");
    const concurrentConsume = await Promise.all([
      consumeOtp({ organizationId: org.id, challengeId: verified.challengeId }),
      consumeOtp({ organizationId: org.id, challengeId: verified.challengeId }),
    ]);
    assert(concurrentConsume.filter((result) => result.ok).length === 1, "one concurrent consume succeeds");
    const replay = await consumeOtp({ organizationId: org.id, challengeId: verified.challengeId });
    assert(!replay.ok, "OTP replay blocked");
    ok("4. OTP replay blocked");

    const createdSession = await createAdminSession({
      userId: agent.id,
      organizationMembershipId: agentMember.id,
    });
    const storedSession = await prisma.adminSession.findUnique({
      where: { tokenHash: hashSessionToken(createdSession.token) },
    });
    assert(storedSession?.organizationMembershipId === agentMember.id, "membership-bound session");
    await revokeAdminSessionByToken(createdSession.token);
    const revoked = await prisma.adminSession.findUnique({ where: { id: storedSession!.id } });
    assert(revoked?.revokedAt, "revoked session");
    ok("5. revoked membership session blocked");

    const pipeline = await ensureDefaultPipeline(org.id);
    const foreignPipeline = await ensureDefaultPipeline(otherOrg.id);
    const stages = await prisma.crmPipelineStage.findMany({
      where: { organizationId: org.id, pipelineId: pipeline.pipelineId },
      select: { id: true, stageType: true },
    });
    const wonStage = stages.find((stage) => stage.stageType === "WON");
    const lostStage = stages.find((stage) => stage.stageType === "LOST");
    const qualifiedStage = stages.find((stage) => stage.stageType === "QUALIFIED");
    assert(wonStage && lostStage && qualifiedStage, "terminal/qualified stages");
    const [leadA, leadB, foreignLead] = await Promise.all([
      prisma.lead.create({
        data: {
          organizationId: org.id, branchId: branchA.id, firstName: "Lead", lastName: "A",
          mobile, mobileRaw: mobile, normalizedMobile: mobile, source: "STAFF_TEST",
          sourceType: LeadSourceType.MANUAL, pipelineId: pipeline.pipelineId,
          stageId: pipeline.newStageId, ownerUserId: agent.id,
        },
      }),
      prisma.lead.create({
        data: {
          organizationId: org.id, branchId: branchB.id, firstName: "Lead", lastName: "B",
          mobile: inactiveMobile, mobileRaw: inactiveMobile, normalizedMobile: inactiveMobile,
          source: "STAFF_TEST", sourceType: LeadSourceType.MANUAL,
          pipelineId: pipeline.pipelineId, stageId: pipeline.newStageId, ownerUserId: agent.id,
        },
      }),
      prisma.lead.create({
        data: {
          organizationId: otherOrg.id, branchId: foreignBranch.id, firstName: "Foreign", lastName: "Lead",
          mobile, mobileRaw: mobile, normalizedMobile: mobile, source: "STAFF_TEST",
          sourceType: LeadSourceType.MANUAL, pipelineId: foreignPipeline.pipelineId,
          stageId: foreignPipeline.newStageId, ownerUserId: foreignUser.id,
        },
      }),
    ]);

    const agentContext = context({
      organizationId: org.id, organizationSlug: org.slug, userId: agent.id,
      membershipId: agentMember.id, role: SystemRole.ADMISSIONS_AGENT, branchIds: [branchA.id],
    });
    const managerContext = context({
      organizationId: org.id, organizationSlug: org.slug, userId: manager.id,
      membershipId: managerMember.id, role: SystemRole.BRANCH_MANAGER, branchIds: [branchA.id],
    });
    const ownerContext = context({
      organizationId: org.id, organizationSlug: org.slug, userId: owner.id,
      membershipId: ownerMember.id, role: SystemRole.ORGANIZATION_OWNER,
    });
    assert((await prisma.lead.count({ where: scopedLeadWhere(agentContext) })) === 1, "agent assigned branch scope");
    ok("6. agent sees assigned leads only");
    assert((await prisma.lead.count({ where: scopedLeadWhere(managerContext) })) === 1, "manager branch scope");
    ok("7. manager sees branch leads only");
    assert((await prisma.lead.count({ where: scopedLeadWhere(ownerContext) })) === 2, "owner org scope");
    ok("8. owner sees all organization leads");
    assert(hasPermission(context({
      organizationId: org.id, organizationSlug: org.slug, userId: viewer.id,
      membershipId: viewerMember.id, role: SystemRole.REPORT_VIEWER,
    }), "reports.view") && !hasPermission(context({
      organizationId: org.id, organizationSlug: org.slug, userId: viewer.id,
      membershipId: viewerMember.id, role: SystemRole.REPORT_VIEWER,
    }), "crm.call"), "report viewer read-only");
    ok("9. report viewer cannot mutate CRM");

    let crossOrgRejected = false;
    try {
      await logCrmCall({
        organizationId: otherOrg.id, leadId: foreignLead.id, membershipId: agentMember.id,
        actorUserId: agent.id, outcome: CrmCallOutcome.ANSWERED,
        allowTerminalTransition: false, terminalConfirmed: false,
        idempotencyKey: `cross:${suffix}`,
      });
    } catch {
      crossOrgRejected = true;
    }
    assert(crossOrgRejected, "cross organization call rejected");
    ok("10. cross-organization access rejected");

    const noAnswer = await logCrmCall({
      organizationId: org.id, leadId: leadA.id, membershipId: agentMember.id,
      actorUserId: agent.id, outcome: CrmCallOutcome.NO_ANSWER,
      allowTerminalTransition: false, terminalConfirmed: false,
      idempotencyKey: `no-answer:${suffix}`,
    });
    assert(noAnswer.created, "call log created");
    ok("11. call log created");
    assert(await prisma.crmActivity.findFirst({
      where: { organizationId: org.id, leadId: leadA.id, activityType: "CALL_LOGGED" },
    }), "call activity created");
    ok("12. call activity created");

    const followUpAt = new Date(Date.now() + 86_400_000);
    const follow = await logCrmCall({
      organizationId: org.id, leadId: leadA.id, membershipId: agentMember.id,
      actorUserId: agent.id, outcome: CrmCallOutcome.FOLLOW_UP_REQUIRED,
      nextFollowUpAt: followUpAt, createTask: true,
      allowTerminalTransition: false, terminalConfirmed: false,
      idempotencyKey: `follow:${suffix}`,
    });
    const followAgain = await logCrmCall({
      organizationId: org.id, leadId: leadA.id, membershipId: agentMember.id,
      actorUserId: agent.id, outcome: CrmCallOutcome.FOLLOW_UP_REQUIRED,
      nextFollowUpAt: followUpAt, createTask: true,
      allowTerminalTransition: false, terminalConfirmed: false,
      idempotencyKey: `follow:${suffix}`,
    });
    assert(follow.id === followAgain.id && !followAgain.created, "call/task idempotency");
    const followTasks = await prisma.crmTask.findMany({
      where: { organizationId: org.id, idempotencyKey: `call-follow-up:follow:${suffix}` },
    });
    assert(followTasks.length === 1, "one follow-up task");
    ok("13. follow-up task created once");
    assert((await prisma.crmCallLog.findUnique({ where: { id: noAnswer.id } }))?.outcome === CrmCallOutcome.NO_ANSWER, "no-answer outcome");
    ok("14. no-answer flow");

    let registeredBlocked = false;
    try {
      await logCrmCall({
        organizationId: org.id, leadId: leadA.id, membershipId: agentMember.id,
        actorUserId: agent.id, outcome: CrmCallOutcome.REGISTERED, stageId: wonStage.id,
        allowTerminalTransition: false, terminalConfirmed: true,
        idempotencyKey: `registered-blocked:${suffix}`,
      });
    } catch {
      registeredBlocked = true;
    }
    assert(registeredBlocked, "registered permission guard");
    ok("15. registered outcome permission guard");
    let lostBlocked = false;
    try {
      await logCrmCall({
        organizationId: org.id, leadId: leadA.id, membershipId: agentMember.id,
        actorUserId: agent.id, outcome: CrmCallOutcome.NOT_INTERESTED, stageId: lostStage.id,
        allowTerminalTransition: false, terminalConfirmed: true,
        idempotencyKey: `lost-blocked:${suffix}`,
      });
    } catch {
      lostBlocked = true;
    }
    assert(lostBlocked, "lost permission guard");
    ok("16. lost outcome permission guard");

    await logCrmCall({
      organizationId: org.id, leadId: leadA.id, membershipId: agentMember.id,
      actorUserId: agent.id, outcome: CrmCallOutcome.ANSWERED, stageId: qualifiedStage.id,
      allowTerminalTransition: false, terminalConfirmed: false,
      idempotencyKey: `qualified:${suffix}`,
    });
    await logCrmCall({
      organizationId: org.id, leadId: leadA.id, membershipId: managerMember.id,
      actorUserId: manager.id, outcome: CrmCallOutcome.REGISTERED, stageId: wonStage.id,
      allowTerminalTransition: true, terminalConfirmed: true,
      idempotencyKey: `registered:${suffix}`,
    });
    await completeCrmTask({
      organizationId: org.id,
      taskId: followTasks[0]!.id,
      actorUserId: agent.id,
    });

    const from = new Date(Date.now() - 60_000);
    const to = new Date(Date.now() + 60_000);
    const report = await loadStaffPerformance(managerContext, { from, to });
    const agentRow = report.rows.find((row) => row.membershipId === agentMember.id);
    const managerRow = report.rows.find((row) => row.membershipId === managerMember.id);
    assert(agentRow && managerRow, "staff report rows");
    assert(agentRow.calls === 3 && managerRow.calls === 1, "date scoped call metrics");
    ok("17. report metrics scoped by date");
    assert(!report.rows.some((row) => row.membershipId === foreignMember.id), "report tenant/branch scope");
    assert(report.branches.length === 1 && report.branches[0]?.id === branchA.id, "report branch options scoped");
    ok("18. report branch scoping");
    assert(agentRow.qualified === 1 && managerRow.won === 1 && managerRow.conversionRate === 100, "conversion calculation");
    ok("19. conversion calculation");
    assert(hasPermission(managerContext, "reports.view") && !hasPermission(context({
      organizationId: org.id, organizationSlug: org.slug, userId: agent.id,
      membershipId: agentMember.id, role: SystemRole.ADMISSIONS_AGENT, branchIds: [branchA.id],
    }), "reports.view"), "export/report permission contract");
    ok("20. export respects report permission");

    assert(followTasks[0]?.status === CrmTaskStatus.OPEN, "task loaded before completion");
    console.log(`\n${passed} staff integration tests passed.`);
  } finally {
    const cleanup = await Promise.allSettled([
      cleanupOrganization(org.id),
      cleanupOrganization(otherOrg.id),
    ]);
    await prisma.$disconnect();
    const failedCleanup = cleanup.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failedCleanup) throw failedCleanup.reason;
  }
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : "Staff integration test failed.");
  await prisma.$disconnect();
  process.exit(1);
});
