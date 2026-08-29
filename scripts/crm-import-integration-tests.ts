/**
 * CRM import database integration tests.
 *
 * Safety: requires a dedicated CRM_IMPORT_TEST_DATABASE_URL that is different
 * from DATABASE_URL. The normal application database is never used.
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const testDatabaseUrl = process.env.CRM_IMPORT_TEST_DATABASE_URL?.trim();
if (!testDatabaseUrl) {
  throw new Error(
    "CRM_IMPORT_TEST_DATABASE_URL is required and must point to a migrated disposable test database.",
  );
}
if (testDatabaseUrl === process.env.DATABASE_URL) {
  throw new Error("CRM import integration tests refuse to use DATABASE_URL.");
}
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: testDatabaseUrl,
});

const { SystemRole, UserStatus, MembershipStatus, LeadSourceType } =
  await import("../generated/prisma/enums");
const { prisma } = await import("../lib/prisma");
const { importCrmLeads } = await import("../lib/crm/import-service");

const suffix = randomBytes(5).toString("hex");
const orgSlug = `crm-import-test-${suffix}`;
const otherOrgSlug = `crm-import-other-${suffix}`;

function row(
  excelRowNumber: number,
  mobile: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    excelRowNumber,
    profile: {
      firstName: "نام جدید",
      lastName: "نام خانوادگی جدید",
      fatherName: null,
      mobile,
      mobileRaw: mobile,
      nationalCode: null,
      school: null,
      gradeLevel: null,
      studyField: null,
      city: null,
      province: null,
      gender: null,
      birthDate: null,
      description: null,
      importedEmail: null,
      importedSource: null,
      ...overrides,
    },
  };
}

async function main() {
  const user = await prisma.user.create({
    data: {
      firstName: "Import",
      lastName: "Tester",
      email: `crm-import-${suffix}@example.test`,
      status: UserStatus.ACTIVE,
    },
  });
  const org = await prisma.organization.create({
    data: { name: "CRM Import Test", slug: orgSlug },
  });
  const branch = await prisma.branch.create({
    data: {
      organizationId: org.id,
      name: "Test Branch",
      slug: `branch-${suffix}`,
    },
  });
  const membership = await prisma.organizationMembership.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: SystemRole.ADMISSIONS_MANAGER,
      status: MembershipStatus.ACTIVE,
    },
  });
  const actor = {
    organizationId: org.id,
    membershipId: membership.id,
    userId: user.id,
    isPlatformAdmin: false,
  };

  const duplicateMobile = `0912${suffix.replace(/\D/g, "").padEnd(7, "1").slice(0, 7)}`;
  const softDeletedMobile = `0913${suffix.replace(/\D/g, "").padEnd(7, "2").slice(0, 7)}`;
  const isolatedMobile = `0914${suffix.replace(/\D/g, "").padEnd(7, "3").slice(0, 7)}`;

  try {
    const existing = await prisma.lead.create({
      data: {
        organizationId: org.id,
        branchId: branch.id,
        firstName: "نام اصلی",
        lastName: "نام خانوادگی اصلی",
        mobile: duplicateMobile,
        mobileRaw: duplicateMobile,
        normalizedMobile: duplicateMobile,
        source: "TEST",
        sourceType: LeadSourceType.MANUAL,
        metadata: { preserved: true },
      },
    });

    const skipped = await importCrmLeads({
      actor,
      branchId: branch.id,
      strategy: "SKIP",
      validRows: [row(2, duplicateMobile)],
      invalidRows: [],
    });
    assert.equal(skipped.created, 0);
    assert.equal(skipped.skipped, 1);
    assert.equal(await prisma.lead.count({ where: { organizationId: org.id, normalizedMobile: duplicateMobile } }), 1);
    console.log("✓ database duplicate is skipped");

    const updated = await importCrmLeads({
      actor,
      branchId: branch.id,
      strategy: "UPDATE_EMPTY_FIELDS",
      validRows: [
        row(3, duplicateMobile, {
          firstName: "نباید جایگزین شود",
          school: "مدرسه تکمیلی",
          importedEmail: "student@example.test",
        }),
      ],
      invalidRows: [],
    });
    assert.equal(updated.updated, 1);
    const afterUpdate = await prisma.lead.findUniqueOrThrow({
      where: { id: existing.id },
      select: { firstName: true, school: true, metadata: true },
    });
    assert.equal(afterUpdate.firstName, "نام اصلی");
    assert.equal(afterUpdate.school, "مدرسه تکمیلی");
    assert.deepEqual(afterUpdate.metadata, {
      preserved: true,
      importedEmail: "student@example.test",
    });
    console.log("✓ UPDATE_EMPTY_FIELDS preserves populated fields and metadata");

    const deleted = await prisma.lead.create({
      data: {
        organizationId: org.id,
        branchId: branch.id,
        firstName: "حذف",
        lastName: "شده",
        mobile: softDeletedMobile,
        mobileRaw: softDeletedMobile,
        normalizedMobile: softDeletedMobile,
        source: "TEST",
        sourceType: LeadSourceType.MANUAL,
        deletedAt: new Date(),
      },
    });
    const softDeletedResult = await importCrmLeads({
      actor,
      branchId: branch.id,
      strategy: "UPDATE_EMPTY_FIELDS",
      validRows: [row(4, softDeletedMobile, { school: "نباید ثبت شود" })],
      invalidRows: [],
    });
    assert.equal(softDeletedResult.skipped, 1);
    const deletedAfter = await prisma.lead.findUniqueOrThrow({ where: { id: deleted.id } });
    assert.ok(deletedAfter.deletedAt);
    assert.equal(deletedAfter.school, null);
    console.log("✓ soft-deleted duplicate remains deleted and unchanged");

    const otherOrg = await prisma.organization.create({
      data: { name: "Other CRM Import Test", slug: otherOrgSlug },
    });
    const otherBranch = await prisma.branch.create({
      data: {
        organizationId: otherOrg.id,
        name: "Other Branch",
        slug: `other-${suffix}`,
      },
    });
    await prisma.lead.create({
      data: {
        organizationId: otherOrg.id,
        branchId: otherBranch.id,
        firstName: "سازمان",
        lastName: "دیگر",
        mobile: isolatedMobile,
        mobileRaw: isolatedMobile,
        normalizedMobile: isolatedMobile,
        source: "TEST",
        sourceType: LeadSourceType.MANUAL,
      },
    });
    const isolated = await importCrmLeads({
      actor,
      branchId: branch.id,
      strategy: "SKIP",
      validRows: [row(5, isolatedMobile)],
      invalidRows: [],
    });
    assert.equal(isolated.created, 1);
    assert.equal(
      await prisma.lead.count({ where: { normalizedMobile: isolatedMobile } }),
      2,
    );
    console.log("✓ duplicate detection is isolated by organization");
  } finally {
    const organizationIds = (
      await prisma.organization.findMany({
        where: { slug: { in: [orgSlug, otherOrgSlug] } },
        select: { id: true },
      })
    ).map((item) => item.id);
    if (organizationIds.length > 0) {
      await prisma.crmActivity.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await prisma.auditLog.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await prisma.lead.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await prisma.crmPipelineStage.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await prisma.crmPipeline.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await prisma.branch.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await prisma.organizationMembership.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await prisma.organization.deleteMany({ where: { id: { in: organizationIds } } });
    }
    await prisma.user.deleteMany({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}

await main();
console.log("\nAll CRM import database integration tests passed.");
