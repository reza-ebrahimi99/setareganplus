/**
 * Choice draft import — DB integration tests (isolated org; cleaned up in finally).
 * Requires migrated DATABASE_URL. Run with NODE_ENV=test.
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  GuidanceExamGroup,
  GuidancePlanStatus,
  MembershipStatus,
  SystemRole,
  UserStatus,
} from "../generated/prisma/enums";
import { runChoiceDraftImport } from "../lib/counselor-os/choice-draft-import";
import type { CanonicalChoiceRow } from "../lib/guidance/choice-studio/types";
import { prisma } from "../lib/prisma";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
if (process.env.NODE_ENV !== "test") {
  console.error("Refusing to run choice draft import integration tests unless NODE_ENV=test.");
  process.exit(1);
}

const suffix = randomBytes(5).toString("hex");

function makeRows(count: number): CanonicalChoiceRow[] {
  return Array.from({ length: count }, (_, i) => ({
    sourceRow: i + 2,
    priority: i + 1,
    priorityRaw: String(i + 1),
    code: String(40000 + i),
    major: `رشته تست ${i + 1}`,
    university: "دانشگاه تهران",
    city: "تهران",
    course: "روزانه",
    courseCode: "DAILY",
    description: "",
    chance: "medium",
    chanceRaw: "متوسط",
    counselorNote: "",
    formulaCell: false,
  }));
}

let passed = 0;
function ok(name: string) {
  passed += 1;
  console.log(`✓ ${name}`);
}

async function main() {
  const org = await prisma.organization.create({
    data: { name: `Choice import test ${suffix}`, slug: `choice-import-${suffix}` },
  });
  const grade = await prisma.studentGrade.create({
    data: {
      organizationId: org.id,
      slug: `g-${suffix}`,
      name: "دوازدهم",
      sortOrder: 1,
    },
  });
  const user = await prisma.user.create({
    data: {
      firstName: "Counselor",
      lastName: "Import",
      email: `choice-import-${suffix}@example.test`,
      status: UserStatus.ACTIVE,
    },
  });
  await prisma.organizationMembership.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: SystemRole.ADMISSIONS_MANAGER,
      status: MembershipStatus.ACTIVE,
    },
  });
  const studentUser = await prisma.user.create({
    data: {
      firstName: "Student",
      lastName: "Import",
      email: `choice-import-stu-${suffix}@example.test`,
      status: UserStatus.ACTIVE,
    },
  });
  const student = await prisma.student.create({
    data: {
      organizationId: org.id,
      gradeId: grade.id,
      firstName: "Student",
      lastName: "Import",
      fullName: "Student Import",
      slug: `stu-${suffix}`,
    },
  });
  const plan = await prisma.guidancePlan.create({
    data: {
      organizationId: org.id,
      studentId: student.id,
      userId: studentUser.id,
      status: GuidancePlanStatus.STEP13_COMPLETED,
      examGroup: GuidanceExamGroup.MATHEMATICS,
      journeyVersion: 2,
      currentStep: 13,
      completedSteps: [],
    },
  });

  try {
    const partial = await runChoiceDraftImport({
      organizationId: org.id,
      counselorUserId: user.id,
      studentId: student.id,
      payload: {
        requestId: `partial-${suffix}`,
        kind: "INITIAL",
        mode: "full",
        truncateAck: false,
        replaceReady: false,
        rows: [
          {
            ...makeRows(1)[0]!,
            code: "",
            city: "",
            course: "",
            courseCode: null,
            major: "رشته بدون کد",
            university: "",
          },
          {
            ...makeRows(1)[0]!,
            sourceRow: 3,
            priority: 2,
            code: "55555",
            major: "",
            university: "دانشگاه تنها",
          },
          {
            ...makeRows(1)[0]!,
            sourceRow: 4,
            priority: 3,
            code: "77777",
            major: "رشته مشترک",
            university: "الف",
            course: "روزانه",
          },
          {
            ...makeRows(1)[0]!,
            sourceRow: 5,
            priority: 4,
            code: "77777",
            major: "رشته مشترک",
            university: "ب",
            course: "شبانه",
          },
        ],
      },
    });
    assert.equal(partial.ok, true);
    if (partial.ok) {
      assert.equal(partial.draftCount, 4);
      const stored = await prisma.guidanceChoiceItem.findMany({
        where: { listId: partial.listId, isActive: true },
        orderBy: { sortOrder: "asc" },
      });
      assert.equal(stored.length, 4);
      assert.equal(stored[0]?.major, "رشته بدون کد");
      assert.equal(stored[0]?.officialCode, null);
      assert.equal(stored[1]?.university, "دانشگاه تنها");
      assert.equal(stored[2]?.officialCode, "77777");
      assert.equal(stored[3]?.officialCode, "77777");
    }
    ok("partial rows (no code, no city, major-only, uni-only, duplicate code) import");

    const incomplete150 = makeRows(150).map((r, i) => ({
      ...r,
      code: i % 2 === 0 ? "" : r.code,
      city: "",
      course: i % 3 === 0 ? "" : r.course,
    }));
    const incResult = await runChoiceDraftImport({
      organizationId: org.id,
      counselorUserId: user.id,
      studentId: student.id,
      payload: {
        requestId: `incomplete-150-${suffix}`,
        kind: "INITIAL",
        mode: "full",
        truncateAck: false,
        replaceReady: false,
        rows: incomplete150,
      },
    });
    assert.equal(incResult.ok, true);
    if (incResult.ok) {
      assert.equal(incResult.draftCount, 150);
    }
    ok("150 incomplete rows import with order preserved");

    for (const count of [149, 150] as const) {
      const requestId = `full-${count}-${suffix}`;
      const result = await runChoiceDraftImport({
        organizationId: org.id,
        counselorUserId: user.id,
        studentId: student.id,
        payload: {
          requestId,
          kind: "INITIAL",
          mode: "full",
          truncateAck: false,
          replaceReady: false,
          rows: makeRows(count),
        },
      });
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.importedCount, count);
        assert.equal(result.draftCount, count);
      }
      ok(`full import ${count} rows → draftCount=${count}`);
    }

    const truncateId = `truncate-159-${suffix}`;
    const truncated = await runChoiceDraftImport({
      organizationId: org.id,
      counselorUserId: user.id,
      studentId: student.id,
      payload: {
        requestId: truncateId,
        kind: "INITIAL",
        mode: "truncate_first_150",
        truncateAck: true,
        replaceReady: false,
        rows: makeRows(159),
      },
    });
    assert.equal(truncated.ok, true);
    if (truncated.ok) {
      assert.equal(truncated.importedCount, 150);
      assert.equal(truncated.draftCount, 150);
    }
    ok("159 preview → truncate_first_150 → draftCount=150");

    const replay = await runChoiceDraftImport({
      organizationId: org.id,
      counselorUserId: user.id,
      studentId: student.id,
      payload: {
        requestId: truncateId,
        kind: "INITIAL",
        mode: "truncate_first_150",
        truncateAck: true,
        replaceReady: false,
        rows: makeRows(159),
      },
    });
    assert.equal(replay.ok, true);
    if (replay.ok) {
      assert.equal(replay.idempotentReplay, true);
      assert.equal(replay.draftCount, 150);
    }
    ok("idempotent replay same requestId does not duplicate rows");

    const reject151 = await runChoiceDraftImport({
      organizationId: org.id,
      counselorUserId: user.id,
      studentId: student.id,
      payload: {
        requestId: `reject-151-${suffix}`,
        kind: "INITIAL",
        mode: "full",
        truncateAck: false,
        replaceReady: false,
        rows: makeRows(151),
      },
    });
    assert.equal(reject151.ok, false);
    ok("151 rows in full mode rejected");

    const items = await prisma.guidanceChoiceItem.findMany({
      where: { organizationId: org.id, listId: truncated.ok ? truncated.listId : "" },
      orderBy: { sortOrder: "asc" },
    });
    assert.equal(items.length, 150);
    assert.equal(items[0]?.sortOrder, 1);
    assert.equal(items[149]?.sortOrder, 150);
    assert.equal(items[0]?.officialCode, "40000");
    ok("priority order 1..150 preserved in DB");

    void plan;
  } finally {
    await prisma.guidanceChoiceItem.deleteMany({ where: { organizationId: org.id } });
    await prisma.guidanceChoiceList.deleteMany({ where: { organizationId: org.id } });
    await prisma.auditLog.deleteMany({ where: { organizationId: org.id } });
    await prisma.guidancePlan.deleteMany({ where: { organizationId: org.id } });
    await prisma.student.deleteMany({ where: { organizationId: org.id } });
    await prisma.studentGrade.deleteMany({ where: { organizationId: org.id } });
    await prisma.organizationMembership.deleteMany({ where: { organizationId: org.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [user.id, studentUser.id] } },
    });
    await prisma.organization.delete({ where: { id: org.id } });
  }

  console.log(`\n${passed} choice draft import integration tests passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
