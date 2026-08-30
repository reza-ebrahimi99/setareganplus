/**
 * Manual QA helper — NOT part of the production migration/seed path.
 * Provisions one test student + GuidancePlan + portal session token so the
 * Journey Engine can be exercised end-to-end via curl/browser without going
 * through OTP. Safe to re-run (idempotent by slug/mobile).
 */
import {
  BookingMeetingType,
  MembershipStatus,
  PortalAccountType,
  SystemRole,
  UserStatus,
} from "../generated/prisma/enums";
import { createSessionToken, hashSessionToken } from "../lib/auth/crypto";
import { PORTAL_SESSION_TTL_MS } from "../lib/auth/cookie";
import { prisma } from "../lib/prisma";

const MOBILE = "09120000001";
const SLUG = "guidance-e2e-test-student";

async function main() {
  const org = await prisma.organization.findFirstOrThrow({
    where: { isActive: true, deletedAt: null },
  });

  await prisma.organizationFeatureFlag.upsert({
    where: { organizationId_key: { organizationId: org.id, key: "guidance" } },
    update: { enabled: true },
    create: { organizationId: org.id, key: "guidance", enabled: true },
  });

  let grade = await prisma.studentGrade.findFirst({
    where: { organizationId: org.id, deletedAt: null },
  });
  if (!grade) {
    grade = await prisma.studentGrade.create({
      data: { organizationId: org.id, slug: "grade-12", name: "پایه دوازدهم" },
    });
  }

  let user = await prisma.user.findFirst({ where: { normalizedMobile: MOBILE } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        normalizedMobile: MOBILE,
        firstName: "دانش‌آموز",
        lastName: "آزمایشی",
        status: UserStatus.ACTIVE,
      },
    });
  }

  let student = await prisma.student.findFirst({
    where: { organizationId: org.id, slug: SLUG },
  });
  if (!student) {
    student = await prisma.student.create({
      data: {
        organizationId: org.id,
        gradeId: grade.id,
        firstName: "دانش‌آموز",
        lastName: "آزمایشی",
        fullName: "دانش‌آموز آزمایشی",
        slug: SLUG,
        biography: "",
      },
    });
  }

  let membership = await prisma.organizationMembership.findFirst({
    where: { organizationId: org.id, userId: user.id },
  });
  if (!membership) {
    membership = await prisma.organizationMembership.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: SystemRole.STUDENT,
        status: MembershipStatus.ACTIVE,
      },
    });
  }

  let link = await prisma.portalAccountLink.findFirst({
    where: { organizationId: org.id, userId: user.id, accountType: PortalAccountType.STUDENT },
  });
  if (!link) {
    link = await prisma.portalAccountLink.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        accountType: PortalAccountType.STUDENT,
        studentId: student.id,
        isActive: true,
      },
    });
  }

  let plan = await prisma.guidancePlan.findFirst({
    where: { organizationId: org.id, userId: user.id, deletedAt: null },
  });
  if (!plan) {
    plan = await prisma.guidancePlan.create({
      data: {
        organizationId: org.id,
        studentId: student.id,
        userId: user.id,
        examGroup: "MATHEMATICS",
        status: "PRE_REGISTERED",
        // Simulates a completed pre-registration/onboarding (consent already
        // granted) so the parent layout's onboarding gate does not redirect.
        consentGrantedAt: new Date(),
        consentVersion: "guidance-e2e-test",
        consentText: "test",
      },
    });
  }

  // Booking service + advisor + a future slot for Step 4 / Step 11 testing.
  for (const [slug, title] of [
    ["guidance-first-session", "جلسه اول مشاوره انتخاب رشته"],
    ["guidance-second-session", "جلسه دوم مشاوره انتخاب رشته"],
  ] as const) {
    let service = await prisma.bookingService.findFirst({
      where: { organizationId: org.id, slug },
    });
    if (!service) {
      service = await prisma.bookingService.create({
        data: {
          organizationId: org.id,
          slug,
          title,
          durationMinutes: 30,
          meetingTypes: JSON.stringify([BookingMeetingType.ONLINE]),
        },
      });
    }

    let advisor = await prisma.bookingAdvisor.findFirst({
      where: { organizationId: org.id, displayName: "مشاور آزمایشی" },
    });
    if (!advisor) {
      advisor = await prisma.bookingAdvisor.create({
        data: { organizationId: org.id, displayName: "مشاور آزمایشی" },
      });
    }

    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);
    const existingSlot = await prisma.bookingSlot.findFirst({
      where: { organizationId: org.id, serviceId: service.id, advisorId: advisor.id, startsAt },
    });
    if (!existingSlot) {
      await prisma.bookingSlot.create({
        data: {
          organizationId: org.id,
          serviceId: service.id,
          advisorId: advisor.id,
          startsAt,
          endsAt,
          capacity: 3,
        },
      });
    }
  }

  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  await prisma.adminSession.create({
    data: {
      userId: user.id,
      organizationMembershipId: membership.id,
      tokenHash,
      expiresAt: new Date(Date.now() + PORTAL_SESSION_TTL_MS),
    },
  });

  console.log(
    JSON.stringify(
      {
        organizationId: org.id,
        organizationSlug: org.slug,
        userId: user.id,
        studentId: student.id,
        planId: plan.id,
        planPublicId: plan.publicId,
        portalAccountLinkId: link.id,
        portalSessionToken: token,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
