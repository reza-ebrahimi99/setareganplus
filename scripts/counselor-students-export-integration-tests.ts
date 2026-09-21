/**
 * Integration tests — counselor students export auth + row parity (requires .env DB).
 */

import assert from "node:assert/strict";
import {
  listCounselorStudentsFiltered,
  COUNSELOR_STUDENTS_EXPORT_MAX,
} from "@/lib/counselor-os/students";
import { loadCounselorStudentsExportBundle } from "@/lib/counselor-os/students-export/load-data";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import { prisma } from "@/lib/prisma";
import type { SystemRole } from "@/generated/prisma/enums";

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    console.log("skip: database unreachable");
    return;
  }

  const org = await prisma.organization.findFirst({
    where: { deletedAt: null },
    select: { id: true },
  });
  if (!org) {
    console.log("skip: no organization");
    return;
  }

  const supervisor = await prisma.organizationMembership.findFirst({
    where: {
      organizationId: org.id,
      role: { not: "ADVISOR" },
      deletedAt: null,
    },
    select: { userId: true },
  });

  if (!supervisor) {
    console.log("skip: no supervisor membership");
    return;
  }

  const ctx: CounselorContext = {
    organizationId: org.id,
    userId: supervisor.userId,
    displayName: "test",
    canReview: true,
    isPlatformAdmin: false,
    role: "ORGANIZATION_ADMIN" as SystemRole,
    roleLabel: "مدیر",
    isSupervisor: true,
    viewingAsCounselor: false,
  };

  const { items: filtered, total } = await listCounselorStudentsFiltered(ctx, {
    maxCandidates: COUNSELOR_STUDENTS_EXPORT_MAX,
  });

  const bundle = await loadCounselorStudentsExportBundle({
    ctx,
    scope: "all",
    filters: {},
  });

  assert.equal(bundle.mainRows.length, total);
  assert.equal(bundle.mainRows.length, filtered.length);

  const advisorMembership = await prisma.organizationMembership.findFirst({
    where: { organizationId: org.id, role: "ADVISOR", deletedAt: null },
    select: { userId: true },
  });

  if (advisorMembership) {
    const advisorCtx: CounselorContext = {
      ...ctx,
      userId: advisorMembership.userId,
      canReview: false,
      isSupervisor: false,
      viewingAsCounselor: true,
      role: "ADVISOR" as SystemRole,
    };
    const assigned = await prisma.counselorStudentAssignment.findMany({
      where: {
        organizationId: org.id,
        counselorUserId: advisorMembership.userId,
        status: "ACTIVE",
      },
      select: { studentId: true },
    });
    const advisorBundle = await loadCounselorStudentsExportBundle({
      ctx: advisorCtx,
      scope: "all",
      filters: {},
    });
    const allowed = new Set(assigned.map((a) => a.studentId));
    for (const row of advisorBundle.mainRows) {
      assert.ok(allowed.has(String(row.studentId)));
    }
  }

  console.log("ok counselor-students-export-integration-tests");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
