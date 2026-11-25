import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

function asDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

const loadPublishedClassCatalog = unstable_cache(
  async () => {
    const [courses, topics, premiumLessons] = await Promise.all([
      prisma.classCourse.findMany({
        where: { published: true },
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: { where: { published: true }, select: { durationSec: true, isPremium: true, poster: true, sortOrder: true } },
          files: { where: { published: true, lessonId: null }, select: { id: true } },
          _count: { select: { enrollments: true } },
        },
      }),
      prisma.classCourse.findMany({ where: { published: true, kind: "TOPIC" }, orderBy: { sortOrder: "asc" }, select: { slug: true, title: true } }),
      prisma.classLesson.findMany({
        where: { published: true, isPremium: true, course: { published: true } },
        orderBy: { createdAt: "desc" },
        take: 24,
        select: { id: true, title: true, aparatHash: true, poster: true, durationSec: true, createdAt: true, course: { select: { slug: true, title: true, teacher: true } } },
      }),
    ]);
    return { courses, topics, premiumLessons };
  },
  ["classes-catalog"],
  { revalidate: 60, tags: ["classes-catalog"] },
);

/** Dates come back as ISO strings from the cache; restore them before the page uses getTime(). */
export async function getPublishedClassCatalog() {
  const data = await loadPublishedClassCatalog();
  return {
    ...data,
    premiumLessons: data.premiumLessons.map((l) => ({ ...l, createdAt: asDate(l.createdAt) })),
  };
}
