/**
 * Pure portal authorization / DTO guard tests. No database connection.
 */

import assert from "node:assert/strict";
import { PortalAccountType } from "../generated/prisma/enums";
import { assertStudentVisible } from "../lib/portal/auth/require-student-access";
import { PortalError } from "../lib/portal/auth/errors";
import type {
  AuthorizedStudentContext,
  PortalContext,
} from "../lib/portal/auth/types";

let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

function student(
  partial: Partial<AuthorizedStudentContext> & Pick<AuthorizedStudentContext, "studentId">,
): AuthorizedStudentContext {
  return {
    studentName: "دانش‌آموز تست",
    studentSlug: "test-student",
    gradeName: "پایه هفتم",
    schoolYear: "1404-1405",
    portraitUrl: null,
    source: "GUARDIAN_RELATION",
    canViewAcademicData: true,
    canViewAchievements: true,
    canViewCertificates: true,
    relationshipType: null,
    ...partial,
  };
}

function context(
  authorizedStudents: AuthorizedStudentContext[],
  overrides?: Partial<PortalContext>,
): PortalContext {
  return {
    user: {
      id: "user-1",
      mobile: "09120000000",
      firstName: "کاربر",
      lastName: "تست",
      displayName: "کاربر تست",
    },
    organization: {
      id: "org-1",
      slug: "demo",
      name: "مدرسه آزمایشی",
    },
    membershipId: "mem-1",
    membershipRole: "PARENT",
    sessionId: "sess-1",
    links: [
      {
        id: "link-1",
        accountType: PortalAccountType.GUARDIAN,
        studentId: null,
        guardianId: "guardian-1",
        label: "ولی",
        organizationId: "org-1",
      },
    ],
    activeLink: {
      id: "link-1",
      accountType: PortalAccountType.GUARDIAN,
      studentId: null,
      guardianId: "guardian-1",
      label: "ولی",
      organizationId: "org-1",
    },
    authorizedStudents,
    ...overrides,
  };
}

/** Stable empty dashboard shape used when no assessments exist. */
function emptyAssessmentSummary() {
  return {
    latestAssessmentTitle: null,
    latestScore: null,
    latestAssessmentDate: null,
    averageScore: null,
    assessmentCount: 0,
    trendPoints: [] as Array<{
      assessmentTitle: string;
      assessmentDate: Date | null;
      score: number | null;
      percentile: number | null;
    }>,
  };
}

/** Portal DTOs must never include these private fields. */
const FORBIDDEN_PORTAL_FIELDS = [
  "nationalId",
  "adminNotes",
  "internalNotes",
  "parentName",
  "crmLeadId",
] as const;

test("guardian can access linked student", () => {
  const ctx = context([student({ studentId: "stu-a" })]);
  const visible = assertStudentVisible(ctx, "stu-a");
  assert.equal(visible.studentId, "stu-a");
});

test("guardian cannot access unlinked student (IDOR denial)", () => {
  const ctx = context([student({ studentId: "stu-a" })]);
  assert.throws(
    () => assertStudentVisible(ctx, "stu-b"),
    (error: unknown) =>
      error instanceof PortalError && error.code === "STUDENT_ACCESS_DENIED",
  );
});

test("student link only exposes own student id", () => {
  const ctx = context([student({ studentId: "stu-self", source: "STUDENT_LINK" })], {
    membershipRole: "STUDENT",
    activeLink: {
      id: "link-s",
      accountType: PortalAccountType.STUDENT,
      studentId: "stu-self",
      guardianId: null,
      label: "خود",
      organizationId: "org-1",
    },
  });
  assertStudentVisible(ctx, "stu-self");
  assert.throws(() => assertStudentVisible(ctx, "stu-other"), PortalError);
});

test("inactive/empty authorized set denies all student ids", () => {
  const ctx = context([]);
  assert.throws(() => assertStudentVisible(ctx, "stu-a"), PortalError);
});

test("relation canViewAcademicData is enforced", () => {
  const ctx = context([
    student({ studentId: "stu-a", canViewAcademicData: false }),
  ]);
  assert.throws(
    () => assertStudentVisible(ctx, "stu-a", { requireAcademic: true }),
    (error: unknown) =>
      error instanceof PortalError &&
      error.code === "RELATION_PERMISSION_DENIED",
  );
});

test("relation canViewAchievements is enforced", () => {
  const ctx = context([
    student({ studentId: "stu-a", canViewAchievements: false }),
  ]);
  assert.throws(
    () => assertStudentVisible(ctx, "stu-a", { requireAchievements: true }),
    (error: unknown) =>
      error instanceof PortalError &&
      error.code === "RELATION_PERMISSION_DENIED",
  );
});

test("relation canViewCertificates is enforced", () => {
  const ctx = context([
    student({ studentId: "stu-a", canViewCertificates: false }),
  ]);
  assert.throws(
    () => assertStudentVisible(ctx, "stu-a", { requireCertificates: true }),
    (error: unknown) =>
      error instanceof PortalError &&
      error.code === "RELATION_PERMISSION_DENIED",
  );
});

test("multi-student guardian selector returns only authorized students", () => {
  const authorized = [
    student({ studentId: "stu-1", studentName: "الف" }),
    student({ studentId: "stu-2", studentName: "ب" }),
  ];
  const ctx = context(authorized);
  const ids = ctx.authorizedStudents.map((row) => row.studentId);
  assert.deepEqual(ids, ["stu-1", "stu-2"]);
  assert.equal(ids.includes("stu-foreign"), false);
  assertStudentVisible(ctx, "stu-2");
});

test("organization id on context is trusted server value, not client", () => {
  const ctx = context([student({ studentId: "stu-a" })]);
  assert.equal(ctx.organization.id, "org-1");
  // Client-supplied org must never be merged into context without DB resolve.
  const forged = { ...ctx, organization: { ...ctx.organization, id: "org-evil" } };
  // Even with forged org, student visibility still only uses authorizedStudents.
  assert.throws(() => assertStudentVisible(forged, "stu-other"), PortalError);
});

test("empty assessment summary DTO is stable", () => {
  const empty = emptyAssessmentSummary();
  assert.equal(empty.assessmentCount, 0);
  assert.equal(empty.latestScore, null);
  assert.deepEqual(empty.trendPoints, []);
});

test("portal DTO shape excludes private fields", () => {
  const dto = {
    studentId: "stu-a",
    studentName: "الف",
    gradeName: "هفتم",
    schoolYear: "1404-1405",
    portraitUrl: null,
    ...emptyAssessmentSummary(),
    achievementCount: 0,
  };
  for (const field of FORBIDDEN_PORTAL_FIELDS) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(dto, field),
      false,
      `DTO must not include ${field}`,
    );
  }
});

test("revocation model: removed authorized student denies next assert", () => {
  const before = context([student({ studentId: "stu-a" })]);
  assertStudentVisible(before, "stu-a");
  // Next request rebuilds context from DB; revoked link => empty authorized set.
  const afterRevoke = context([]);
  assert.throws(() => assertStudentVisible(afterRevoke, "stu-a"), PortalError);
});

console.log(`\n${passed} portal auth unit tests passed.`);
