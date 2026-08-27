import { prisma } from "@/lib/prisma";
import {
  buildCardSnapshot,
  membershipLabelFor,
  type CardSnapshot,
} from "@/lib/sxp/engine/card";
import type { EngineSourceEvent, HandlerOutcome } from "@/lib/sxp/engine/types";
import type { PortalContext } from "@/lib/portal/auth/types";
import { PortalAccountType } from "@/generated/prisma/enums";

export async function upsertStudentCardProjection(params: {
  organizationId: string;
  userId: string;
  studentId: string;
  snapshot: CardSnapshot;
}): Promise<void> {
  await prisma.experienceStudentCard.upsert({
    where: {
      organizationId_userId_studentId: {
        organizationId: params.organizationId,
        userId: params.userId,
        studentId: params.studentId,
      },
    },
    update: {
      displayName: params.snapshot.displayName,
      studentCode: params.snapshot.studentCode,
      maskedNationalCode: params.snapshot.maskedNationalCode,
      schoolName: params.snapshot.schoolName,
      branchName: params.snapshot.branchName,
      gradeName: params.snapshot.gradeName,
      schoolYear: params.snapshot.schoolYear,
      membershipLabel: params.snapshot.membershipLabel,
      ...(params.snapshot.portraitUrl
        ? { portraitUrl: params.snapshot.portraitUrl }
        : {}),
      qrPayload: params.snapshot.qrPayload,
      qrTokenHash: params.snapshot.qrTokenHash,
      portalId: params.snapshot.portalId,
      completionRatio: params.snapshot.completionRatio,
      refreshedAt: new Date(),
    },
    create: {
      organizationId: params.organizationId,
      userId: params.userId,
      studentId: params.studentId,
      displayName: params.snapshot.displayName,
      studentCode: params.snapshot.studentCode,
      maskedNationalCode: params.snapshot.maskedNationalCode,
      schoolName: params.snapshot.schoolName,
      branchName: params.snapshot.branchName,
      gradeName: params.snapshot.gradeName,
      schoolYear: params.snapshot.schoolYear,
      membershipLabel: params.snapshot.membershipLabel,
      portraitUrl: params.snapshot.portraitUrl,
      qrPayload: params.snapshot.qrPayload,
      qrTokenHash: params.snapshot.qrTokenHash,
      portalId: params.snapshot.portalId,
      completionRatio: params.snapshot.completionRatio,
    },
  });
}

/**
 * Hub-safe ensure: PortalContext only (identity already trusted).
 * Does not query booking, CRM, or commerce.
 */
export async function ensureStudentCardsFromContext(
  context: PortalContext,
): Promise<void> {
  const profile = await prisma.experienceProfile.findUnique({
    where: {
      organizationId_userId: {
        organizationId: context.organization.id,
        userId: context.user.id,
      },
    },
    select: { interests: true, displayName: true },
  });

  for (const student of context.authorizedStudents) {
    const snapshot = buildCardSnapshot({
      organizationId: context.organization.id,
      organizationName: context.organization.name,
      userId: context.user.id,
      studentId: student.studentId,
      displayName: profile?.displayName ?? student.studentName,
      studentCode: student.studentSlug,
      nationalCode: null,
      gradeName: student.gradeName,
      schoolYear: student.schoolYear,
      portraitUrl: student.portraitUrl,
      branchName: null,
      membershipLabel: membershipLabelFor(context.activeLink.accountType),
      interests: profile?.interests ?? null,
    });
    await upsertStudentCardProjection({
      organizationId: context.organization.id,
      userId: context.user.id,
      studentId: student.studentId,
      snapshot,
    });
  }
}

export async function runStudentCardRefresher(params: {
  event: EngineSourceEvent;
}): Promise<HandlerOutcome> {
  const owner = await prisma.experienceTimelineEvent.findFirst({
    where: {
      organizationId: params.event.organizationId,
      sourceEventId: params.event.outboxEventId,
    },
    select: { userId: true },
  });
  if (!owner) {
    return { status: "skipped", reason: "no_timeline" };
  }

  const links = await prisma.portalAccountLink.findMany({
    where: {
      organizationId: params.event.organizationId,
      userId: owner.userId,
      deletedAt: null,
      isActive: true,
      studentId: { not: null },
    },
    select: {
      accountType: true,
      studentId: true,
    },
  });

  if (links.length === 0) {
    return { status: "skipped", reason: "no_student_link" };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: params.event.organizationId },
    select: { name: true },
  });
  const profile = await prisma.experienceProfile.findUnique({
    where: {
      organizationId_userId: {
        organizationId: params.event.organizationId,
        userId: owner.userId,
      },
    },
    select: { displayName: true, interests: true },
  });

  for (const link of links) {
    if (!link.studentId) continue;
    const student = await prisma.student.findFirst({
      where: {
        organizationId: params.event.organizationId,
        id: link.studentId,
        deletedAt: null,
      },
      select: {
        id: true,
        fullName: true,
        slug: true,
        schoolYear: true,
        grade: { select: { name: true } },
      },
    });
    if (!student) continue;
    const snapshot = buildCardSnapshot({
      organizationId: params.event.organizationId,
      organizationName: organization?.name ?? "",
      userId: owner.userId,
      studentId: student.id,
      displayName: profile?.displayName ?? student.fullName,
      studentCode: student.slug,
      nationalCode: null,
      gradeName: student.grade.name,
      schoolYear: student.schoolYear,
      portraitUrl: null,
      branchName: null,
      membershipLabel: membershipLabelFor(
        link.accountType === PortalAccountType.GUARDIAN
          ? "GUARDIAN"
          : "STUDENT",
      ),
      interests: profile?.interests ?? null,
    });
    await upsertStudentCardProjection({
      organizationId: params.event.organizationId,
      userId: owner.userId,
      studentId: student.id,
      snapshot,
    });
  }

  return { status: "processed", userId: owner.userId };
}
