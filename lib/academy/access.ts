import {
  AcademyCourseStatus,
  AcademyLessonStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type LessonAccessResult =
  | { allowed: true; reason: "PREVIEW" | "COURSE" | "LESSON" }
  | { allowed: false; reason: "NOT_FOUND" | "NOT_PUBLISHED" | "NO_ENTITLEMENT" | "EXPIRED" | "REVOKED" };

function isEntitlementActive(params: {
  startsAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  now: Date;
}): boolean {
  if (params.revokedAt) return false;
  if (params.startsAt > params.now) return false;
  if (params.expiresAt && params.expiresAt <= params.now) return false;
  return true;
}

export async function canUserAccessLesson(params: {
  organizationId: string;
  userId: string;
  lessonId: string;
  now?: Date;
}): Promise<LessonAccessResult> {
  const now = params.now ?? new Date();

  const lesson = await prisma.academyLesson.findFirst({
    where: {
      id: params.lessonId,
      organizationId: params.organizationId,
    },
    select: {
      id: true,
      status: true,
      isPreview: true,
      courseId: true,
      course: { select: { status: true, deletedAt: true } },
    },
  });

  if (!lesson || lesson.course.deletedAt) {
    return { allowed: false, reason: "NOT_FOUND" };
  }

  if (
    lesson.status !== AcademyLessonStatus.PUBLISHED ||
    lesson.course.status !== AcademyCourseStatus.PUBLISHED
  ) {
    if (!lesson.isPreview) {
      return { allowed: false, reason: "NOT_PUBLISHED" };
    }
  }

  if (lesson.isPreview) {
    return { allowed: true, reason: "PREVIEW" };
  }

  const entitlements = await prisma.academyContentEntitlement.findMany({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      OR: [{ lessonId: params.lessonId }, { courseId: lesson.courseId }],
    },
    select: {
      courseId: true,
      lessonId: true,
      startsAt: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (entitlements.length === 0) {
    return { allowed: false, reason: "NO_ENTITLEMENT" };
  }

  const active = entitlements.filter((e) =>
    isEntitlementActive({
      startsAt: e.startsAt,
      expiresAt: e.expiresAt,
      revokedAt: e.revokedAt,
      now,
    }),
  );

  if (active.length === 0) {
    const hadRevoked = entitlements.some((e) => e.revokedAt);
    if (hadRevoked) return { allowed: false, reason: "REVOKED" };
    return { allowed: false, reason: "EXPIRED" };
  }

  const lessonGrant = active.find((e) => e.lessonId === params.lessonId);
  if (lessonGrant) return { allowed: true, reason: "LESSON" };

  const courseGrant = active.find((e) => e.courseId === lesson.courseId && !e.lessonId);
  if (courseGrant) return { allowed: true, reason: "COURSE" };

  const courseWide = active.find((e) => e.courseId === lesson.courseId);
  if (courseWide) return { allowed: true, reason: "COURSE" };

  return { allowed: false, reason: "NO_ENTITLEMENT" };
}

export async function userOwnsCourse(params: {
  organizationId: string;
  userId: string;
  courseId: string;
}): Promise<boolean> {
  const now = new Date();
  const row = await prisma.academyContentEntitlement.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      courseId: params.courseId,
      lessonId: null,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true },
  });
  return Boolean(row);
}
