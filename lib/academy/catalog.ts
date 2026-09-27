import {
  AcademyCourseStatus,
  AcademyLessonStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function listPublishedCourses(organizationId: string) {
  return prisma.academyCourse.findMany({
    where: {
      organizationId,
      deletedAt: null,
      status: AcademyCourseStatus.PUBLISHED,
    },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { publishedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      subtitle: true,
      shortDescription: true,
      instructorName: true,
      thumbnailStorageKey: true,
      coverStorageKey: true,
      priceRials: true,
      compareAtPriceRials: true,
      featured: true,
      lifetimeAccess: true,
      _count: { select: { lessons: { where: { status: AcademyLessonStatus.PUBLISHED } } } },
    },
  });
}

export async function getPublishedCourseBySlug(
  organizationId: string,
  slug: string,
) {
  return prisma.academyCourse.findFirst({
    where: {
      organizationId,
      slug,
      deletedAt: null,
      status: AcademyCourseStatus.PUBLISHED,
    },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            where: { status: AcademyLessonStatus.PUBLISHED },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              slug: true,
              durationSeconds: true,
              isPreview: true,
              sellIndividually: true,
              individualPriceRials: true,
            },
          },
        },
      },
      lessons: {
        where: { sectionId: null, status: AcademyLessonStatus.PUBLISHED },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          slug: true,
          durationSeconds: true,
          isPreview: true,
          sellIndividually: true,
          individualPriceRials: true,
        },
      },
    },
  });
}

export async function listIndividualVideoProducts(organizationId: string) {
  return prisma.academyLesson.findMany({
    where: {
      organizationId,
      sellIndividually: true,
      status: AcademyLessonStatus.PUBLISHED,
      individualPriceRials: { gt: 0 },
      course: { status: AcademyCourseStatus.PUBLISHED, deletedAt: null },
    },
    orderBy: { updatedAt: "desc" },
    take: 24,
    select: {
      id: true,
      title: true,
      slug: true,
      durationSeconds: true,
      individualPriceRials: true,
      course: { select: { title: true, slug: true, instructorName: true } },
    },
  });
}

export async function getIndividualLessonProduct(
  organizationId: string,
  slug: string,
) {
  return prisma.academyLesson.findFirst({
    where: {
      organizationId,
      slug,
      sellIndividually: true,
      status: AcademyLessonStatus.PUBLISHED,
      course: { status: AcademyCourseStatus.PUBLISHED, deletedAt: null },
    },
    include: {
      course: {
        select: {
          title: true,
          slug: true,
          instructorName: true,
        },
      },
    },
  });
}
