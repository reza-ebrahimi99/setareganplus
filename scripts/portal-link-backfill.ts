/**
 * Optional admin-only helper for carefully linking known users to portal targets.
 *
 * Dry-run by default. Never matches solely by name / parentName.
 * Requires explicit --confirm to write.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/portal-link-backfill.ts --org=<orgId>
 *   npx tsx --env-file=.env scripts/portal-link-backfill.ts --org=<orgId> --mobile=0912... --student=<id>
 *   npx tsx --env-file=.env scripts/portal-link-backfill.ts --org=<orgId> --mobile=0912... --guardian=<id> --confirm
 */

import {
  MembershipStatus,
  PortalAccountType,
  SystemRole,
  UserStatus,
} from "../generated/prisma/enums";
import { normalizeIranianMobile } from "../lib/forms/normalize-mobile";
import { prisma } from "../lib/prisma";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((value) => value.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const organizationId = arg("org");
  const mobileRaw = arg("mobile");
  const studentId = arg("student");
  const guardianId = arg("guardian");
  const confirm = hasFlag("confirm");

  if (!organizationId) {
    console.error("Required: --org=<organizationId>");
    process.exit(1);
  }

  const org = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!org) {
    console.error("Organization not found.");
    process.exit(1);
  }

  if (!mobileRaw || (!studentId && !guardianId) || (studentId && guardianId)) {
    console.log(
      JSON.stringify(
        {
          mode: confirm ? "WRITE" : "DRY_RUN",
          organizationId: org.id,
          organizationName: org.name,
          message:
            "Provide exactly one of --student=<id> or --guardian=<id>, plus --mobile=. Add --confirm to write.",
          note: "This script never infers links from parentName or free-text names.",
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  const parsed = normalizeIranianMobile(mobileRaw);
  if (!parsed.ok) {
    console.error("Invalid mobile.");
    process.exit(1);
  }

  if (studentId) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, organizationId, deletedAt: null },
      select: { id: true, fullName: true },
    });
    if (!student) {
      console.error("Student not found in organization (ambiguous/missing).");
      process.exit(1);
    }
  }

  if (guardianId) {
    const guardian = await prisma.studentGuardian.findFirst({
      where: { id: guardianId, organizationId, deletedAt: null },
      select: { id: true, fullName: true },
    });
    if (!guardian) {
      console.error("Guardian not found in organization (ambiguous/missing).");
      process.exit(1);
    }
  }

  const accountType = studentId
    ? PortalAccountType.STUDENT
    : PortalAccountType.GUARDIAN;
  const role =
    accountType === PortalAccountType.STUDENT
      ? SystemRole.STUDENT
      : SystemRole.PARENT;

  let user = await prisma.user.findFirst({
    where: { normalizedMobile: parsed.normalized, deletedAt: null },
    select: { id: true, firstName: true, lastName: true },
  });

  const plan = {
    mode: confirm ? "WRITE" : "DRY_RUN",
    organizationId,
    mobile: parsed.normalized,
    accountType,
    studentId: studentId ?? null,
    guardianId: guardianId ?? null,
    userId: user?.id ?? null,
    willCreateUser: !user,
  };

  console.log(JSON.stringify(plan, null, 2));

  if (!confirm) {
    console.log("Dry-run only. Re-run with --confirm to apply.");
    return;
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        firstName: "کاربر",
        lastName: "پرتال",
        mobile: parsed.normalized,
        normalizedMobile: parsed.normalized,
        status: UserStatus.ACTIVE,
      },
      select: { id: true, firstName: true, lastName: true },
    });
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: { organizationId, userId: user.id, deletedAt: null },
    select: { id: true },
  });
  if (!membership) {
    await prisma.organizationMembership.create({
      data: {
        organizationId,
        userId: user.id,
        role,
        status: MembershipStatus.ACTIVE,
      },
    });
  }

  const existing = await prisma.portalAccountLink.findFirst({
    where: {
      organizationId,
      userId: user.id,
      ...(studentId ? { studentId } : { guardianId }),
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.portalAccountLink.update({
      where: { id: existing.id },
      data: {
        accountType,
        studentId: studentId ?? null,
        guardianId: guardianId ?? null,
        isActive: true,
        deletedAt: null,
      },
    });
  } else {
    await prisma.portalAccountLink.create({
      data: {
        organizationId,
        userId: user.id,
        accountType,
        studentId: studentId ?? null,
        guardianId: guardianId ?? null,
        isActive: true,
      },
    });
  }

  console.log("Portal link applied.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
