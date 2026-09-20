/**
 * Manual add/edit choice items — DB integration (isolated org, cleaned up in finally).
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
import {
  addChoiceItem,
  ensureWorkingList,
  markListReady,
  updateChoiceItem,
} from "../lib/guidance/journey-v2/choices";
import { CHOICE_LIST_KIND } from "../lib/guidance/journey-v2/constants";
import { prisma } from "../lib/prisma";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
if (process.env.NODE_ENV !== "test") {
  console.error("Refusing to run manual choice integration tests unless NODE_ENV=test.");
  process.exit(1);
}

const suffix = randomBytes(5).toString("hex");
let passed = 0;
function ok(name: string) {
  passed += 1;
  console.log(`✓ ${name}`);
}

async function main() {
  const org = await prisma.organization.create({
    data: { name: `Manual choice test ${suffix}`, slug: `manual-choice-${suffix}` },
  });
  const grade = await prisma.studentGrade.create({
    data: {
      organizationId: org.id,
      slug: `g-${suffix}`,
      name: "دوازدهم",
      sortOrder: 1,
    },
  });
  const counselor = await prisma.user.create({
    data: {
      firstName: "Manual",
      lastName: "Counselor",
      email: `manual-counselor-${suffix}@example.test`,
      status: UserStatus.ACTIVE,
    },
  });
  const studentUser = await prisma.user.create({
    data: {
      firstName: "Manual",
      lastName: "Student",
      email: `manual-student-${suffix}@example.test`,
      status: UserStatus.ACTIVE,
    },
  });
  const student = await prisma.student.create({
    data: {
      organizationId: org.id,
      gradeId: grade.id,
      firstName: "Manual",
      lastName: "Student",
      fullName: "Manual Student",
      slug: `stu-manual-${suffix}`,
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
    const list = await ensureWorkingList({
      organizationId: org.id,
      planId: plan.id,
      studentId: student.id,
      counselorUserId: counselor.id,
      kind: CHOICE_LIST_KIND.INITIAL,
    });

    const majorOnly = await addChoiceItem({
      organizationId: org.id,
      listId: list.id,
      input: { major: "رشته تنها", university: "", city: "", educationType: "" },
    });
    assert.equal(majorOnly.major, "رشته تنها");
    ok("manual add with major only");

    const uniOnly = await addChoiceItem({
      organizationId: org.id,
      listId: list.id,
      input: { major: "", university: "دانشگاه تنها", city: "", educationType: "" },
    });
    assert.equal(uniOnly.university, "دانشگاه تنها");
    ok("manual add with university only");

    await assert.rejects(
      () =>
        addChoiceItem({
          organizationId: org.id,
          listId: list.id,
          input: { major: "", university: "", city: "" },
        }),
      /EMPTY_CHOICE_ITEM/,
    );
    ok("completely empty manual add rejected");

    const updated = await updateChoiceItem({
      organizationId: org.id,
      listId: list.id,
      itemId: majorOnly.id,
      input: {
        major: majorOnly.major,
        university: "",
        city: "",
        educationType: "",
        officialCode: null,
        band: null,
        notes: "",
        rationale: "",
      },
    });
    assert.equal(updated.officialCode, null);
    assert.equal(updated.city, null);
    assert.equal(updated.major, "رشته تنها");
    ok("edit clears official code and city");

    await markListReady({
      organizationId: org.id,
      listId: list.id,
      counselorUserId: counselor.id,
    });
    const ready = await prisma.guidanceChoiceList.findUnique({ where: { id: list.id } });
    assert.equal(ready?.status, "READY");
    ok("publish draft with incomplete field data");
  } finally {
    await prisma.guidanceChoiceItem.deleteMany({ where: { organizationId: org.id } });
    await prisma.auditLog.deleteMany({ where: { organizationId: org.id } });
    await prisma.guidanceChoiceList.deleteMany({ where: { organizationId: org.id } });
    await prisma.guidancePlan.deleteMany({ where: { organizationId: org.id } });
    await prisma.student.deleteMany({ where: { organizationId: org.id } });
    await prisma.studentGrade.deleteMany({ where: { organizationId: org.id } });
    await prisma.user.deleteMany({ where: { id: { in: [counselor.id, studentUser.id] } } });
    await prisma.organization.delete({ where: { id: org.id } });
  }

  console.log(`\n${passed} manual choice integration tests passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
